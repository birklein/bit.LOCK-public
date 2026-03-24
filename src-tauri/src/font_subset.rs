use lopdf::{Document, Object, ObjectId};
use std::collections::{HashMap, HashSet};

/// Info about an embedded font in the PDF
struct EmbeddedFont {
    /// Object ID of the font dictionary
    font_dict_id: ObjectId,
    /// Object ID of the font stream (FontFile2/FontFile3)
    font_stream_id: ObjectId,
    /// Font name (e.g. "Arial" or "ABCDEF+Arial")
    base_name: String,
    /// Font type: "TrueType" or "CFF"
    font_type: FontType,
    /// Resource name used in content streams (e.g. "F1", "F2")
    resource_names: Vec<String>,
}

#[derive(Debug, PartialEq)]
enum FontType {
    TrueType,
    Cff,
}

/// Result of font subsetting for a single font
#[allow(dead_code)]
pub struct SubsetResult {
    pub font_name: String,
    pub original_bytes: usize,
    pub subset_bytes: usize,
}

/// Run font subsetting on a loaded PDF document. Returns total bytes saved.
pub fn subset_fonts(doc: &mut Document) -> Vec<SubsetResult> {
    let mut results = Vec::new();

    // Step 1: Find all embedded fonts
    let fonts = find_embedded_fonts(doc);
    if fonts.is_empty() {
        return results;
    }

    // Step 2: Collect used character codes per font resource name
    let used_chars = collect_used_chars(doc);

    // Step 3+4: Subset each font and update the PDF
    for font in fonts {
        // Skip already-subsetted fonts (name starts with 6 uppercase letters + "+")
        if is_already_subsetted(&font.base_name) {
            continue;
        }

        // Collect all char codes used with this font's resource names
        let mut all_codes: HashSet<u16> = HashSet::new();
        for rname in &font.resource_names {
            if let Some(codes) = used_chars.get(rname) {
                all_codes.extend(codes);
            }
        }

        if all_codes.is_empty() {
            continue;
        }

        // Get font stream bytes
        let font_bytes = match doc.objects.get(&font.font_stream_id) {
            Some(Object::Stream(s)) => {
                let mut stream_clone = s.clone();
                stream_clone.decompress();
                stream_clone.content.clone()
            }
            _ => continue,
        };

        let original_size = font_bytes.len();
        if original_size < 1024 {
            // Font is already tiny, skip
            continue;
        }

        // Map character codes to glyph IDs using ttf-parser
        let glyph_ids = match char_codes_to_glyph_ids(&font_bytes, &all_codes) {
            Some(gids) => gids,
            None => continue,
        };

        if glyph_ids.is_empty() {
            continue;
        }

        // Subset the font
        let remapper = subsetter::GlyphRemapper::new_from_glyphs_sorted(&glyph_ids);
        let subset_bytes = match subsetter::subset(&font_bytes, 0, &remapper) {
            Ok(bytes) => bytes,
            Err(_) => continue, // Graceful: skip fonts that fail
        };

        if subset_bytes.len() >= original_size {
            continue; // No savings
        }

        // Update the font stream in the PDF
        if let Some(Object::Stream(ref mut stream)) = doc.objects.get_mut(&font.font_stream_id) {
            let new_len = subset_bytes.len();
            stream.content = subset_bytes.clone();
            stream.dict.set("Length", Object::Integer(new_len as i64));
            // Re-set filter to ensure it's stored correctly
            // Remove any existing compression since we're writing raw font bytes
            stream.dict.remove(b"Filter");
            stream.dict.remove(b"DecodeParms");

            // Update Length1 for TrueType fonts
            if font.font_type == FontType::TrueType {
                stream.dict.set("Length1", Object::Integer(new_len as i64));
            }
        }

        // Update font name to indicate subsetting (ABCDEF+Name)
        let subset_tag = generate_subset_tag();
        let new_name = format!("{}+{}", subset_tag, font.base_name);
        update_font_name(doc, font.font_dict_id, &new_name);

        results.push(SubsetResult {
            font_name: font.base_name.clone(),
            original_bytes: original_size,
            subset_bytes: subset_bytes.len(),
        });
    }

    results
}

/// Find all fonts in the PDF that have embedded font programs
fn find_embedded_fonts(doc: &Document) -> Vec<EmbeddedFont> {
    let mut fonts = Vec::new();
    let mut font_resource_map: HashMap<ObjectId, Vec<String>> = HashMap::new();

    // Scan page resources for font references
    for page_id in doc.page_iter() {
        if let Ok((Some(res_dict), _inherited_ids)) = doc.get_page_resources(page_id) {
            scan_font_resources(doc, res_dict, &mut font_resource_map);
        }
    }

    // Now find font dicts that have embedded streams
    for (font_dict_id, resource_names) in &font_resource_map {
        if let Some(Object::Dictionary(font_dict)) = doc.objects.get(font_dict_id) {
            let descriptor_id = match font_dict.get(b"FontDescriptor") {
                Ok(Object::Reference(id)) => *id,
                _ => continue,
            };

            let descriptor = match doc.objects.get(&descriptor_id) {
                Some(Object::Dictionary(d)) => d,
                _ => continue,
            };

            let (stream_id, font_type) =
                if let Ok(Object::Reference(id)) = descriptor.get(b"FontFile2") {
                    (*id, FontType::TrueType)
                } else if let Ok(Object::Reference(id)) = descriptor.get(b"FontFile3") {
                    (*id, FontType::Cff)
                } else {
                    continue;
                };

            let base_name = font_dict
                .get(b"BaseFont")
                .ok()
                .and_then(|o| o.as_name().ok())
                .map(|n| String::from_utf8_lossy(n).to_string())
                .unwrap_or_default();

            fonts.push(EmbeddedFont {
                font_dict_id: *font_dict_id,
                font_stream_id: stream_id,
                base_name,
                font_type,
                resource_names: resource_names.clone(),
            });
        }
    }

    fonts
}

/// Scan a resource dictionary for Font entries
fn scan_font_resources(
    doc: &Document,
    resources: &lopdf::Dictionary,
    map: &mut HashMap<ObjectId, Vec<String>>,
) {
    let fonts_dict = match resources.get(b"Font") {
        Ok(Object::Dictionary(d)) => d.clone(),
        Ok(Object::Reference(id)) => match doc.objects.get(id) {
            Some(Object::Dictionary(d)) => d.clone(),
            _ => return,
        },
        _ => return,
    };

    for (name_bytes, value) in fonts_dict.iter() {
        let name = String::from_utf8_lossy(name_bytes).to_string();
        let font_id = match value {
            Object::Reference(id) => *id,
            _ => continue,
        };

        if let Some(Object::Dictionary(font_dict)) = doc.objects.get(&font_id) {
            // Type0 with DescendantFonts
            if let Ok(Object::Array(descendants)) = font_dict.get(b"DescendantFonts") {
                if let Some(Object::Reference(desc_id)) = descendants.first() {
                    map.entry(*desc_id).or_default().push(name.clone());
                }
            }
            map.entry(font_id).or_default().push(name);
        }
    }
}

/// Parse all page content streams and collect character codes used per font resource name
fn collect_used_chars(doc: &Document) -> HashMap<String, HashSet<u16>> {
    let mut result: HashMap<String, HashSet<u16>> = HashMap::new();

    for page_id in doc.page_iter() {
        let content_data = match doc.get_page_content(page_id) {
            Ok(data) => data,
            Err(_) => continue,
        };

        let operations = match lopdf::content::Content::decode(&content_data) {
            Ok(content) => content.operations,
            Err(_) => continue,
        };

        let mut current_font: Option<String> = None;

        for op in &operations {
            match op.operator.as_str() {
                // Tf: set font — operands: name, size
                "Tf" => {
                    if let Some(Object::Name(name)) = op.operands.first() {
                        current_font = Some(String::from_utf8_lossy(name).to_string());
                    }
                }
                // Text showing operators
                "Tj" | "'" | "\"" => {
                    if let (Some(font), Some(Object::String(bytes, _))) =
                        (&current_font, op.operands.first())
                    {
                        let codes = result.entry(font.clone()).or_default();
                        extract_char_codes(bytes, codes);
                    }
                }
                // TJ: array of strings and positioning
                "TJ" => {
                    if let (Some(font), Some(Object::Array(arr))) =
                        (&current_font, op.operands.first())
                    {
                        let codes = result.entry(font.clone()).or_default();
                        for item in arr {
                            if let Object::String(bytes, _) = item {
                                extract_char_codes(bytes, codes);
                            }
                        }
                    }
                }
                _ => {}
            }
        }
    }

    result
}

/// Extract character codes from a PDF string. Handles both single-byte and double-byte encodings.
fn extract_char_codes(bytes: &[u8], codes: &mut HashSet<u16>) {
    // Most common: single-byte encoding
    for &b in bytes {
        codes.insert(b as u16);
    }
    // Also try as double-byte (for CIDFonts)
    if bytes.len() >= 2 && bytes.len() % 2 == 0 {
        for chunk in bytes.chunks(2) {
            codes.insert(u16::from_be_bytes([chunk[0], chunk[1]]));
        }
    }
}

/// Map character codes to glyph IDs using ttf-parser
fn char_codes_to_glyph_ids(font_data: &[u8], char_codes: &HashSet<u16>) -> Option<Vec<u16>> {
    let face = ttf_parser::Face::parse(font_data, 0).ok()?;
    let mut gids: HashSet<u16> = HashSet::new();

    // Always include glyph 0 (.notdef)
    gids.insert(0);

    for &code in char_codes {
        // Try as Unicode codepoint (most common for WinAnsi/Identity encodings)
        if let Some(ch) = char::from_u32(code as u32) {
            if let Some(gid) = face.glyph_index(ch) {
                gids.insert(gid.0);
                continue;
            }
        }
        // Try common WinAnsi mappings for codes 128-255
        if let Some(unicode) = winansi_to_unicode(code) {
            if let Some(gid) = face.glyph_index(unicode) {
                gids.insert(gid.0);
                continue;
            }
        }
        // For CIDFonts with Identity mapping, code IS the GID
        gids.insert(code);
    }

    let mut sorted: Vec<u16> = gids.into_iter().collect();
    sorted.sort_unstable();
    Some(sorted)
}

/// Map WinAnsiEncoding codes (128-159 range) to Unicode
fn winansi_to_unicode(code: u16) -> Option<char> {
    let unicode = match code {
        0x80 => 0x20AC, // Euro sign
        0x82 => 0x201A, // Single low-9 quotation mark
        0x83 => 0x0192, // Latin small f with hook
        0x84 => 0x201E, // Double low-9 quotation mark
        0x85 => 0x2026, // Horizontal ellipsis
        0x86 => 0x2020, // Dagger
        0x87 => 0x2021, // Double dagger
        0x88 => 0x02C6, // Modifier letter circumflex accent
        0x89 => 0x2030, // Per mille sign
        0x8A => 0x0160, // Latin capital S with caron
        0x8B => 0x2039, // Single left-pointing angle quotation mark
        0x8C => 0x0152, // Latin capital ligature OE
        0x8E => 0x017D, // Latin capital Z with caron
        0x91 => 0x2018, // Left single quotation mark
        0x92 => 0x2019, // Right single quotation mark
        0x93 => 0x201C, // Left double quotation mark
        0x94 => 0x201D, // Right double quotation mark
        0x95 => 0x2022, // Bullet
        0x96 => 0x2013, // En dash
        0x97 => 0x2014, // Em dash
        0x98 => 0x02DC, // Small tilde
        0x99 => 0x2122, // Trade mark sign
        0x9A => 0x0161, // Latin small s with caron
        0x9B => 0x203A, // Single right-pointing angle quotation mark
        0x9C => 0x0153, // Latin small ligature oe
        0x9E => 0x017E, // Latin small z with caron
        0x9F => 0x0178, // Latin capital Y with diaeresis
        _ => return char::from_u32(code as u32),
    };
    char::from_u32(unicode)
}

fn is_already_subsetted(name: &str) -> bool {
    let bytes = name.as_bytes();
    bytes.len() > 7
        && bytes[6] == b'+'
        && bytes[..6].iter().all(|b| b.is_ascii_uppercase())
}

fn generate_subset_tag() -> String {
    use rand::Rng;
    let mut rng = rand::thread_rng();
    (0..6)
        .map(|_| rng.gen_range(b'A'..=b'Z') as char)
        .collect()
}

fn update_font_name(doc: &mut Document, font_dict_id: ObjectId, new_name: &str) {
    if let Some(Object::Dictionary(ref mut dict)) = doc.objects.get_mut(&font_dict_id) {
        dict.set("BaseFont", Object::Name(new_name.as_bytes().to_vec()));

        // Also update FontDescriptor
        if let Ok(Object::Reference(desc_id)) = dict.get(b"FontDescriptor") {
            let desc_id = *desc_id;
            if let Some(Object::Dictionary(ref mut desc)) = doc.objects.get_mut(&desc_id) {
                desc.set("FontName", Object::Name(new_name.as_bytes().to_vec()));
            }
        }
    }
}
