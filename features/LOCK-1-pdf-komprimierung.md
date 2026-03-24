# LOCK-1: PDF-Komprimierung
**Status:** 🟡 In Progress
**Created:** 2026-03-24

## Zusammenfassung

Eigenstaendige Funktion in bit.LOCK zur Verkleinerung von PDF-Dateien. Unabhaengig von der Verschluesselung nutzbar — der User kann ein PDF komprimieren und anschliessend optional verschluesseln, oder nur komprimieren.

## Implementierungsphasen

### Phase 1: Bild-Kompression ✅ Implementiert
- JPEG-Recompression bei niedrigerer Qualitaet
- Flate-Bilder zu JPEG konvertieren
- Downscaling grosser Bilder
- 3 Presets: E-Mail / Standard / Druckqualitaet
- Vorher/Nachher-Vorschau mit Groessenschaetzung
- "Jetzt verschluesseln?" Uebergang zum Encrypt-Wizard

### Phase 2: Font-Subsetting 🔵 Geplant
- Eingebettete Fonts analysieren und auf genutzte Glyphen reduzieren
- Bringt 30–60% Ersparnis auch bei reinen Text-PDFs
- Details siehe "Font-Subsetting Architektur" unten

## User Stories

- Als Nutzer moechte ich eine grosse PDF-Datei verkleinern, damit ich sie einfacher per E-Mail versenden kann.
- Als Nutzer moechte ich vor der Komprimierung sehen, wie gross die Datei aktuell ist und wie gross sie voraussichtlich wird.
- Als Nutzer moechte ich die Qualitaetsstufe waehlen koennen (z.B. "E-Mail-tauglich" vs. "Druckqualitaet").
- Als Nutzer moechte ich nach der Komprimierung optional direkt verschluesseln koennen.
- Als Nutzer moechte ich auch bei Text-PDFs ohne Bilder eine spuerbare Verkleinerung sehen (Font-Subsetting).

## UX-Konzept: Schrittweiser Wizard

### Schritt 1: Datei waehlen
- Gleiche Drop-Zone wie Verschluesselungs-Wizard
- Nach Auswahl: Aktuelle Dateigroesse anzeigen
- "Weiter"-Button → Analyse laeuft

### Schritt 2: Komprimierung konfigurieren
- **Vorschau der Ersparnis:** "12.4 MB → ca. 3.1 MB (75% kleiner)"
- **Qualitaetsstufen** (fuer Bild-Kompression):
  - **E-Mail** (1200px, JPEG Q65) — maximale Kompression
  - **Standard** (1800px, JPEG Q78) — Balance
  - **Druckqualitaet** (2400px, JPEG Q88) — minimale Kompression
- **Font-Subsetting** laeuft immer (kein Quality-Tradeoff)
- Warnung bei 0 Bildern: "Kaum Komprimierung moeglich"
- Voraussichtliche Groesse aktualisiert sich bei Stufenwechsel
- "Jetzt komprimieren"-Button

### Schritt 3: Ergebnis
- Vorher/Nachher-Vergleich mit Prozent-Ersparnis
- "Datei anzeigen"-Button
- **"Jetzt verschluesseln?"** — Weiterleitung in Encrypt-Wizard
- "Weitere Datei komprimieren"-Button

## Technische Architektur

### Rust Crates

| Crate | Zweck | Lizenz | Phase |
|---|---|---|---|
| `lopdf` | PDF-Parsing, Objekt-Manipulation | MIT | 1 ✅ |
| `image` | Bild-Dekodierung/-Enkodierung | MIT | 1 ✅ |
| `flate2` | Deflate-Kompression | MIT/Apache-2.0 | 1 ✅ |
| `subsetter` | TrueType/CFF Font-Subsetting | MIT/Apache-2.0 | 2 |

### Phase 1: Bild-Kompression (implementiert)

1. **PDF parsen** (`lopdf`): Alle Objekte und Streams extrahieren
2. **Bilder identifizieren**: DCTDecode (JPEG) und FlateDecode+Image (PNG-artig)
3. **Bilder recomprimieren** (`image` crate): Qualitaet reduzieren + Downscaling
4. **Sicherheitsnetz**: Wenn komprimiert >= original → Original beibehalten
5. **Strukturoptimierung**: `prune_objects()` + `compress()`

### Phase 2: Font-Subsetting Architektur

#### Ueberblick

PDFs betten oft komplette Schriftarten ein (z.B. Arial = 1.5 MB mit allen ~3000 Glyphen).
Ein typisches Dokument nutzt davon nur 50–200 Zeichen. Font-Subsetting entfernt alle ungenutzten
Glyphen und reduziert die Font-Groesse um 80–95%.

#### Implementierung in 4 Schritten

**Schritt 1: Fonts im PDF finden**
```
Fuer jedes Objekt im PDF:
  → Ist es ein Font-Dictionary?
  → Hat es einen eingebetteten Font-Stream (FontFile, FontFile2, FontFile3)?
  → Font-Typ bestimmen: TrueType, OpenType/CFF, Type1
  → Font-Stream extrahieren (raw bytes)
  → Bereits gesubsettet? (Name beginnt mit 6 Buchstaben + "+") → ueberspringen
```

**Schritt 2: Genutzte Zeichen ermitteln**
```
Fuer jede Seite im PDF:
  → Content-Stream parsen (Text-Operatoren: Tj, TJ, ', ")
  → Aktuellen Font tracken (Tf Operator)
  → Character-Codes sammeln die mit diesem Font gerendert werden
  → Encoding/CMap des Fonts nutzen um Codes → Glyph-IDs zu mappen
```

PDF Text-Operatoren die relevant sind:
- `Tf` — Font setzen (z.B. `/F1 12 Tf`)
- `Tj` — String zeichnen (z.B. `(Hello) Tj`)
- `TJ` — Array mit Strings + Kerning (z.B. `[(H) -20 (ello)] TJ`)
- `'` und `"` — String mit Zeilenumbruch

**Schritt 3: Font subsetten**
```
Fuer jeden Font mit ungenutzten Glyphen:
  → `subsetter` crate aufrufen mit:
    - Original Font-Bytes
    - Set der genutzten Glyph-IDs
  → Neuen (kleineren) Font-Stream zurueckbekommen
  → Subset-Font-Name generieren (ABCDEF+FontName)
```

Der `subsetter` Crate (vom Typst-Projekt) unterstuetzt:
- TrueType (.ttf) — haeufigster Typ in PDFs
- OpenType/CFF (.otf) — zweithaeufigster
- WOFF/WOFF2 — selten in PDFs, aber unterstuetzt

**Schritt 4: PDF aktualisieren**
```
Fuer jeden gesubsetteten Font:
  → Font-Stream im PDF ersetzen (FontFile2/FontFile3)
  → Font-Name aktualisieren (BaseFont, FontDescriptor)
  → Widths-Array anpassen (nur genutzte Zeichen)
  → CMap aktualisieren falls noetig (CIDFont)
  → Length im Stream-Dictionary aktualisieren
```

#### Font-Typ-Matrix

| PDF Font-Typ | Internes Format | `subsetter` Support | Prioritaet |
|---|---|---|---|
| TrueType | FontFile2 (TTF) | ✅ Voll | Hoch — 70% aller PDFs |
| CIDFontType2 | FontFile2 (TTF) | ✅ Voll | Hoch — CJK + Unicode |
| OpenType/CFF | FontFile3 (CFF) | ✅ Voll | Mittel — 20% aller PDFs |
| Type1 | FontFile (PFB) | ❌ Nicht unterstuetzt | Niedrig — Legacy, selten |

Type1-Fonts werden uebersprungen (sind ohnehin klein und selten in modernen PDFs).

#### Risiken und Mitigationen

| Risiko | Mitigation |
|---|---|
| Content-Stream-Parsing komplex | Nur Text-Operatoren parsen, Rest ignorieren |
| CMap-Tabellen variieren stark | Einfache Encodings (WinAnsi, MacRoman) zuerst; CIDFont-CMaps in Iteration 2 |
| Bereits gesubsettete Fonts | Am Prefix erkennen (ABCDEF+) und ueberspringen |
| Subset bricht Font | Original behalten wenn Subset fehlschlaegt (try/catch pro Font) |
| Widths-Array Mismatch | Widths aus dem Subset-Font neu berechnen statt manuell anpassen |

#### Erwartete Einsparungen mit Font-Subsetting

| PDF-Typ | Ohne Subsetting | Mit Subsetting |
|---|---|---|
| Text mit vollen Fonts (Word-Export) | 2–5% | **30–60%** |
| Gemischte Dokumente | 30–50% | **40–65%** |
| Scans / Foto-PDFs | 50–80% | 50–80% (Fonts minimal) |

### Neue Tauri Commands

```rust
// Phase 1 (implementiert)
#[tauri::command]
async fn analyze_pdf(input_path: String) -> Result<PdfAnalysis, String>

#[tauri::command]
async fn compress_pdf(input_path: String, output_path: String, quality: String) -> Result<CompressionResult, String>

// Phase 2: analyze_pdf wird erweitert um font_count + font_bytes
// compress_pdf fuehrt Font-Subsetting automatisch als zusaetzlichen Schritt aus
```

### Frontend-Integration

- Nav-Eintrag in Sidebar: "Komprimieren" (ArrowsPointingInIcon) ✅
- `CompressFlow` Wizard mit 3 Steps ✅
- Am Ende von Step 3: "Jetzt verschluesseln?" Button ✅
- Phase 2 aendert nur Backend — Frontend zeigt automatisch bessere Ergebnisse

## Acceptance Criteria

### Phase 1 ✅
- [x] PDF-Analyse zeigt korrekte Dateigroesse und Bildanzahl
- [x] Alle 3 Qualitaetsstufen funktionieren
- [x] Komprimierte PDFs sind valide
- [x] Vorher/Nachher-Vergleich zeigt echte Werte
- [x] "Jetzt verschluesseln?" Uebergang funktioniert
- [x] Keine externen Binaries — alles in Rust
- [x] Cross-Platform: macOS und Windows
- [x] Warnung bei PDFs ohne Bilder

### Phase 2
- [ ] Font-Analyse: Anzahl Fonts, Gesamtgroesse, bereits gesubsettet?
- [ ] TrueType-Subsetting funktioniert (FontFile2)
- [ ] CFF/OpenType-Subsetting funktioniert (FontFile3)
- [ ] Bereits gesubsettete Fonts werden uebersprungen
- [ ] Fehlerhafte Fonts werden graceful uebersprungen (Original behalten)
- [ ] Widths und CMap korrekt aktualisiert
- [ ] Resultierende PDFs oeffnen korrekt in Adobe Reader, Preview, Chrome
- [ ] Text bleibt selektierbar und durchsuchbar
- [ ] Messbare Ersparnis bei Word/LibreOffice-exportierten PDFs

## Edge Cases

- PDF ohne Bilder und ohne eingebettete Fonts: Kaum Ersparnis moeglich → ehrlich kommunizieren
- Bereits stark komprimierte PDFs: Kann groesser werden → Original beibehalten
- Passwort-geschuetzte PDFs: Ablehnen mit Hinweis
- Sehr grosse PDFs (>100 MB): Progress-Bar mit Abbruch-Option
- PDFs mit transparenten PNG-Bildern: Alpha-Kanal beibehalten, nicht zu JPEG konvertieren
- Type1-Fonts: Ueberspringen (kein Subsetting-Support)
- Fonts die in Formularen/Annotationen genutzt werden: Auch diese Glyphen behalten
