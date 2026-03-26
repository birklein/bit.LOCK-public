# LOCK-1: Vollstaendige bit.SIGN Integration mit echter digitaler Signierung
**Status:** 🟡 In Progress
**Created:** 2026-03-25

## Problem

bit.LOCK sendet aktuell nur einen SHA-256 Hash an bit.SIGN. Das fuehrt zu:
- Kein PDF in bit.SIGN verfuegbar (Dokument ohne Anhang)
- Kein DocuSeal-Template, keine echte Signierung, kein Zertifikat
- Die "signierte" lokale Kopie ist das Original-PDF ohne rechtsgueltige Signatur
- "Weitere Unterzeichner einladen" in bit.SIGN funktioniert nicht (kein PDF vorhanden)

## User Stories

1. **Als Nutzer** will ich ein PDF in bit.LOCK digital signieren und eine rechtsgueltig signierte Kopie mit echtem Zertifikat lokal speichern koennen.
2. **Als Nutzer** will ich den Speicherort der signierten PDF selbst waehlen koennen ("Speichern unter"-Dialog).
3. **Als Nutzer** will ich nach der Signierung optional weitere Unterzeichner ueber bit.SIGN einladen koennen (Geschaeftsfuehrer, Vertragspartner, etc.).

## Acceptance Criteria

- [ ] bit.LOCK laedt das PDF zu bit.SIGN hoch (nicht nur den Hash)
- [ ] bit.SIGN erstellt automatisch ein DocuSeal-Template und loest die Signierung aus
- [ ] Die zurueckgeladene PDF enthaelt ein echtes digitales Zertifikat von DocuSeal
- [ ] "Speichern unter"-Dialog (nativer OS-Dialog) statt fester Speicherpfad
- [ ] Signierte PDF wird read-only gespeichert
- [ ] Zertifikat-Details werden in Schritt 3 (Fertig) angezeigt (nicht "-")
- [ ] "In bit.SIGN oeffnen" oeffnet das Dokument im Browser mit PDF-Anhang
- [ ] Dokument ist in bit.SIGN vollstaendig (PDF + Metadaten + Signatur-Status)
- [ ] Weitere Unterzeichner koennen in bit.SIGN hinzugefuegt werden

## Edge Cases

- PDF-Upload fehlgeschlagen (Netzwerk, Timeout) → klare Fehlermeldung + Retry
- DocuSeal-Signierung dauert laenger → Polling mit Fortschrittsanzeige + Timeout
- User bricht "Speichern unter" ab → signierte PDF trotzdem im Verlauf verfuegbar
- Grosse PDFs (>10 MB) → Fortschrittsanzeige beim Upload
- bit.SIGN nicht erreichbar → Offline-Hinweis, kein stiller Fehler

## Gewuenschter Flow

```
1. User waehlt PDF in bit.LOCK → klickt "Signieren"
2. bit.LOCK laedt PDF zu bit.SIGN hoch
   POST /api/v1/documents (multipart: file + title + reason)
3. bit.SIGN:
   a) Speichert PDF als DocumentVersion (verschluesselt)
   b) Ruft createTemplateFromPdf() auf → DocuSeal-Template
   c) Erstellt Submission mit User als Signer → Signierung laeuft
   d) Gibt documentId + status zurueck
4. bit.LOCK pollt GET /api/v1/documents/{id} bis status=COMPLETED
5. bit.LOCK laedt signierte PDF: GET /api/v1/documents/{id}/signed-pdf
6. Nativer "Speichern unter"-Dialog → User waehlt Speicherort
7. Zertifikat-Details in Erfolgsansicht anzeigen
8. Optional: "In bit.SIGN oeffnen" → Browser oeffnet Dokument-Detailseite
   → User kann dort weitere Unterzeichner einladen
```

## Implementierungsstand

- OAuth2 PKCE Login ✅
- PDF Upload zu bit.SIGN ✅
- Signatur-Canvas (Zeichnen + Tippen) ✅
- PKCS#7-Signierung über bit.SIGN API ✅
- Signierte PDF Download ✅
- Speichern-unter-Dialog ✅
- Zertifikat-Details Anzeige ✅
- Sidebar Sync nach Login ✅
- "In bit.SIGN öffnen" Button ✅ (fix: openUrl via Tauri command statt Plugin-Import)

### Noch offen

- Signatur-Position wählbar (Seite)
- Weitere Unterzeichner einladen Flow

## Betroffene Repos

### bit.SIGN (apps/bit.SIGN)
- `POST /api/v1/documents`: Multipart-Upload akzeptieren (aktuell nur JSON)
- DocumentVersion erstellen + Datei verschluesselt speichern
- `createTemplateFromPdf()` aufrufen (existiert in lib/docuseal.ts, wird nie genutzt)
- `createSubmission()` aufrufen mit OAuth-User als Signer
- `GET /api/v1/documents/{id}`: Status + Zertifikat-Details zurueckgeben
- `GET /api/v1/documents/{id}/signed-pdf`: Signierte PDF aus DocuSeal-Webhook zurueckgeben

### bit.LOCK (tools/bit.LOCK)
- `bitsign_sign_pdf`: PDF als Multipart hochladen statt nur Hash senden
- Polling-Loop fuer Signatur-Status (mit Timeout + Fortschritt)
- Download der signierten PDF von bit.SIGN
- Tauri `dialog::save_file()` fuer nativen "Speichern unter"-Dialog
- Zertifikat-Details (CN, Aussteller, Gueltig bis) in SignStepThree anzeigen
- "In bit.SIGN oeffnen" URL: `{api_url}/documents/{documentId}`

## Technische Erkenntnisse

- `createTemplateFromPdf(name, fileBuffer, fileName)` existiert in bit.SIGN lib/docuseal.ts
- `createSubmission()` existiert und wird von bulk-send genutzt
- DocuSeal-Webhook (`POST /api/webhooks/docuseal`) empfaengt signierte PDFs automatisch
- Dateien werden AES-256-GCM verschluesselt in /uploads/{tenantId}/... gespeichert
- Document-Model: docusealTemplateId, docusealSubmissionId, status (DRAFT→PENDING→COMPLETED)
- OAuth2 opake Token Auth funktioniert (Commit 5e364d2 in bit.SIGN)
