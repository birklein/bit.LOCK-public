use crate::font_subset;
use image::codecs::jpeg::JpegEncoder;
use image::ImageReader;
use lopdf::{Document, Object, Stream};
use serde::{Deserialize, Serialize};
use std::io::Cursor;

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PdfAnalysis {
    pub file_size: u64,
    pub image_count: u32,
    pub font_count: u32,
    pub font_bytes: u64,
    pub fonts_already_subsetted: u32,
    pub estimated_email: u64,
    pub estimated_standard: u64,
    pub estimated_print: u64,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CompressionResult {
    pub original_size: u64,
    pub compressed_size: u64,
    pub savings_percent: f64,
}

/// Quality presets: JPEG quality + max dimension for downscaling
fn quality_params(preset: &str) -> (u8, u32) {
    match preset {
        "email" => (65, 1200),    // aggressive: Q65, max 1200px
        "standard" => (78, 1800), // balanced: Q78, max 1800px
        "print" => (88, 2400),    // light: Q88, max 2400px
        _ => (78, 1800),
    }
}

/// Check if a stream is a JPEG image (DCTDecode filter)
fn is_jpeg_stream(stream: &Stream) -> bool {
    stream_has_filter(stream, "DCTDecode")
}

/// Check if a stream is a Flate-compressed image with dimensions
fn is_flate_image(stream: &Stream) -> bool {
    let has_flate = stream_has_filter(stream, "FlateDecode");
    let has_width = stream.dict.get(b"Width").is_ok();
    let has_subtype = stream
        .dict
        .get(b"Subtype")
        .ok()
        .and_then(|o| o.as_name().ok())
        .map(|n| n == b"Image")
        .unwrap_or(false);
    has_flate && has_width && has_subtype
}

fn stream_has_filter(stream: &Stream, filter_name: &str) -> bool {
    match stream.dict.get(b"Filter") {
        Ok(Object::Name(name)) => name == filter_name.as_bytes(),
        Ok(Object::Array(arr)) => arr.iter().any(|o| {
            if let Object::Name(n) = o {
                n == filter_name.as_bytes()
            } else {
                false
            }
        }),
        _ => false,
    }
}

/// Check if a stream looks like an embedded font (has Length1 or Subtype=CIDFontType0C etc.)
fn is_font_stream(stream: &Stream) -> bool {
    // FontFile2 (TrueType) has Length1
    if stream.dict.get(b"Length1").is_ok() {
        return true;
    }
    // FontFile3 (CFF) has Subtype like CIDFontType0C, Type1C, OpenType
    if let Ok(subtype) = stream.dict.get(b"Subtype") {
        if let Ok(name) = subtype.as_name() {
            let n = String::from_utf8_lossy(name);
            if n.contains("Font") || n.contains("Type1C") || n.contains("OpenType") {
                return true;
            }
        }
    }
    false
}

fn get_int(stream: &Stream, key: &[u8]) -> Option<u32> {
    stream
        .dict
        .get(key)
        .ok()
        .and_then(|o| match o {
            Object::Integer(i) => Some(*i as u32),
            _ => None,
        })
}

/// Recompress a JPEG image at lower quality, optionally downscaling
fn recompress_jpeg(data: &[u8], quality: u8, max_dim: u32) -> Option<Vec<u8>> {
    let reader = ImageReader::new(Cursor::new(data))
        .with_guessed_format()
        .ok()?;
    let img = reader.decode().ok()?;

    // Downscale if needed
    let img = if img.width() > max_dim || img.height() > max_dim {
        img.resize(max_dim, max_dim, image::imageops::FilterType::Lanczos3)
    } else {
        img
    };

    let mut buf = Vec::new();
    let encoder = JpegEncoder::new_with_quality(&mut buf, quality);
    img.write_with_encoder(encoder).ok()?;

    Some(buf)
}

/// Recompress a raw/Flate image as JPEG
fn flate_image_to_jpeg(
    data: &[u8],
    width: u32,
    height: u32,
    color_space_is_rgb: bool,
    quality: u8,
    max_dim: u32,
) -> Option<Vec<u8>> {
    // Decompress Flate data
    use flate2::read::ZlibDecoder;
    use std::io::Read;
    let mut decoder = ZlibDecoder::new(data);
    let mut raw = Vec::new();
    decoder.read_to_end(&mut raw).ok()?;

    let channels = if color_space_is_rgb { 3 } else { 1 };
    let expected = (width * height * channels) as usize;
    if raw.len() < expected {
        return None;
    }

    let img = if color_space_is_rgb {
        image::DynamicImage::ImageRgb8(
            image::RgbImage::from_raw(width, height, raw[..expected].to_vec())?,
        )
    } else {
        image::DynamicImage::ImageLuma8(
            image::GrayImage::from_raw(width, height, raw[..expected].to_vec())?,
        )
    };

    let img = if img.width() > max_dim || img.height() > max_dim {
        img.resize(max_dim, max_dim, image::imageops::FilterType::Lanczos3)
    } else {
        img
    };

    let mut buf = Vec::new();
    let encoder = JpegEncoder::new_with_quality(&mut buf, quality);
    img.write_with_encoder(encoder).ok()?;

    Some(buf)
}

/// Estimate compressed size for a given preset without actually compressing
fn estimate_size(original_size: u64, image_count: u32, total_image_bytes: u64, preset: &str) -> u64 {
    if image_count == 0 || total_image_bytes == 0 {
        // Text-only: almost no savings possible
        return (original_size as f64 * 0.98) as u64;
    }
    let ratio = match preset {
        "email" => 0.25,
        "standard" => 0.45,
        "print" => 0.70,
        _ => 0.45,
    };
    let image_portion = total_image_bytes as f64;
    let rest = (original_size - total_image_bytes) as f64;
    (image_portion * ratio + rest * 0.97) as u64
}

#[tauri::command]
pub async fn analyze_pdf(input_path: String) -> Result<PdfAnalysis, String> {
    let file_size = std::fs::metadata(&input_path)
        .map_err(|e| e.to_string())?
        .len();

    let doc = Document::load(&input_path).map_err(|e| format!("PDF laden fehlgeschlagen: {e}"))?;

    let mut image_count = 0u32;
    let mut total_image_bytes = 0u64;
    let mut font_count = 0u32;
    let mut font_bytes = 0u64;

    for (_id, object) in doc.objects.iter() {
        if let Object::Stream(ref stream) = *object {
            if is_jpeg_stream(stream) || is_flate_image(stream) {
                image_count += 1;
                total_image_bytes += stream.content.len() as u64;
            }
            // Count font streams (FontFile2/FontFile3 are referenced by FontDescriptors)
            if is_font_stream(stream) {
                font_count += 1;
                font_bytes += stream.content.len() as u64;
            }
        }
    }

    // Font subsetting typically saves 80-95% of font bytes
    let font_savings = (font_bytes as f64 * 0.85) as u64;

    Ok(PdfAnalysis {
        file_size,
        image_count,
        font_count,
        font_bytes,
        fonts_already_subsetted: 0, // TODO: count in font_subset
        estimated_email: estimate_size(file_size, image_count, total_image_bytes, "email").saturating_sub(font_savings),
        estimated_standard: estimate_size(file_size, image_count, total_image_bytes, "standard").saturating_sub(font_savings),
        estimated_print: estimate_size(file_size, image_count, total_image_bytes, "print").saturating_sub(font_savings),
    })
}

#[tauri::command]
pub async fn compress_pdf(
    input_path: String,
    output_path: String,
    quality: String,
) -> Result<CompressionResult, String> {
    let original_size = std::fs::metadata(&input_path)
        .map_err(|e| e.to_string())?
        .len();

    let mut doc =
        Document::load(&input_path).map_err(|e| format!("PDF laden fehlgeschlagen: {e}"))?;

    let (jpeg_quality, max_dim) = quality_params(&quality);

    // Collect object IDs that are images (avoid borrow issues)
    let image_ids: Vec<lopdf::ObjectId> = doc
        .objects
        .iter()
        .filter_map(|(id, obj)| {
            if let Object::Stream(stream) = obj {
                if is_jpeg_stream(stream) || is_flate_image(stream) {
                    return Some(*id);
                }
            }
            None
        })
        .collect();

    for id in image_ids {
        let obj = doc.objects.get(&id).cloned();
        if let Some(Object::Stream(stream)) = obj {
            if is_jpeg_stream(&stream) {
                // JPEG: recompress at lower quality
                if let Some(new_data) = recompress_jpeg(&stream.content, jpeg_quality, max_dim) {
                    if new_data.len() < stream.content.len() {
                        if let Some(Object::Stream(ref mut s)) = doc.objects.get_mut(&id) {
                            s.content = new_data;
                            // Update length
                            s.dict
                                .set("Length", Object::Integer(s.content.len() as i64));
                        }
                    }
                }
            } else if is_flate_image(&stream) {
                // Flate image: convert to JPEG
                let width = get_int(&stream, b"Width").unwrap_or(0);
                let height = get_int(&stream, b"Height").unwrap_or(0);
                if width == 0 || height == 0 {
                    continue;
                }

                let is_rgb = stream
                    .dict
                    .get(b"ColorSpace")
                    .ok()
                    .and_then(|o| o.as_name().ok())
                    .map(|n| n == b"DeviceRGB")
                    .unwrap_or(false);

                if let Some(new_data) = flate_image_to_jpeg(
                    &stream.content,
                    width,
                    height,
                    is_rgb,
                    jpeg_quality,
                    max_dim,
                ) {
                    if new_data.len() < stream.content.len() {
                        if let Some(Object::Stream(ref mut s)) = doc.objects.get_mut(&id) {
                            s.content = new_data;
                            // Switch filter to DCTDecode (JPEG)
                            s.dict
                                .set("Filter", Object::Name(b"DCTDecode".to_vec()));
                            s.dict
                                .set("Length", Object::Integer(s.content.len() as i64));
                            // Remove Flate-specific entries
                            s.dict.remove(b"DecodeParms");
                        }
                    }
                }
            }
        }
    }

    // Font subsetting
    let _font_results = font_subset::subset_fonts(&mut doc);

    // Remove unused objects and save
    doc.prune_objects();
    doc.compress();
    doc.save(&output_path)
        .map_err(|e| format!("PDF speichern fehlgeschlagen: {e}"))?;

    let compressed_size = std::fs::metadata(&output_path)
        .map_err(|e| e.to_string())?
        .len();

    // If compressed is larger, copy original
    if compressed_size >= original_size {
        std::fs::copy(&input_path, &output_path).map_err(|e| e.to_string())?;
        return Ok(CompressionResult {
            original_size,
            compressed_size: original_size,
            savings_percent: 0.0,
        });
    }

    let savings = 1.0 - (compressed_size as f64 / original_size as f64);
    Ok(CompressionResult {
        original_size,
        compressed_size,
        savings_percent: (savings * 100.0 * 10.0).round() / 10.0,
    })
}

#[tauri::command]
pub async fn select_compress_save_path(
    app: tauri::AppHandle,
    original_name: String,
) -> Result<Option<String>, String> {
    use tauri_plugin_dialog::DialogExt;
    let base_name = original_name
        .trim_end_matches(".pdf")
        .trim_end_matches(".PDF");
    let default_name = format!("{}_komprimiert.pdf", base_name);
    let path = app
        .dialog()
        .file()
        .set_title("Komprimierte PDF speichern")
        .set_file_name(&default_name)
        .add_filter("PDF-Dateien", &["pdf"])
        .blocking_save_file();
    match path {
        Some(fp) => {
            let pb = fp.into_path().map_err(|e| e.to_string())?;
            Ok(Some(pb.to_string_lossy().to_string()))
        }
        None => Ok(None),
    }
}
