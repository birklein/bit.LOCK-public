# LOCK-2: bit.SIGN Integration
**Status:** 🔵 Planned
**Created:** 2026-03-24

## Zusammenfassung

Optionale Integration mit bit.SIGN fuer rechtsgueltge digitale PDF-Signaturen.
Wird in den Einstellungen aktiviert (oder ueber einen Toggle in der Sidebar).
Nur verfuegbar wenn der Nutzer ein bit.SIGN-Konto hat und im Tenant des Kunden
als User existiert.

## Voraussetzungen

- bit.SIGN Tenant mit gueltigem Abo
- User-Account im bit.SIGN Tenant
- Server-Zertifikat im Tenant konfiguriert (qualifizierte elektronische Signatur)

## User Stories

- Als Firmennutzer moechte ich ein PDF digital signieren koennen, wenn meine Firma ein bit.SIGN Abo hat.
- Als Nutzer moechte ich mich einmalig mit meinem bit.SIGN Konto anmelden und dann direkt aus bit.LOCK signieren koennen.
- Als Nutzer moechte ich nach der Signatur eine lokale, unveraenderbare Kopie des signierten PDFs speichern.
- Als Admin moechte ich die bit.SIGN Integration zentral in den Einstellungen aktivieren/deaktivieren koennen.

## UX-Konzept

### Aktivierung

**Option A — Einstellungen:**
- Neuer Bereich "Integrationen" in den Einstellungen
- Toggle: "bit.SIGN Integration aktivieren"
- Bei Aktivierung: Login-Flow mit bit.SIGN Credentials

**Option B — Sidebar (bevorzugt):**
- Neuer Nav-Eintrag "Signieren" (nur sichtbar wenn aktiviert)
- Beim ersten Klick: Login-Dialog
- Danach: Signatur-Wizard

### Login-Flow

1. User klickt "Mit bit.SIGN anmelden"
2. OAuth2/OIDC Flow gegen bit.SIGN API (PKCE, kein Client Secret lokal)
3. bit.SIGN API prueft: User existiert im Tenant? Tenant hat gueltige Lizenz?
4. Access Token + Refresh Token lokal speichern (verschluesselt mit Machine Key)
5. User sieht: "Angemeldet als max@firma.de (Firma GmbH)"

### Signatur-Wizard (3 Schritte)

**Schritt 1: PDF waehlen**
- Gleiche Drop-Zone wie Verschluesselung
- Oder: direkt aus dem Verschluesselungs-/Komprimierungs-Wizard uebergeben
- "Weiter"-Button

**Schritt 2: Signatur konfigurieren**
- Zertifikat anzeigen (aus bit.SIGN Tenant): Inhaber, Aussteller, Gueltigkeit
- Signatur-Position waehlen (optional): Seite + Position auf der Seite
- Grund der Signatur (optional): Dropdown oder Freitext
  - "Genehmigt", "Zur Kenntnis genommen", "Freigegeben", eigener Text
- Vorschau der Signatur auf dem Dokument

**Schritt 3: Signieren + Ergebnis**
- PDF wird an bit.SIGN API gesendet (Hash des Dokuments, NICHT das Dokument selbst)
- bit.SIGN signiert den Hash mit dem Server-Zertifikat
- Signierte Signatur-Daten werden zurueck an bit.LOCK gesendet
- bit.LOCK bettet die Signatur lokal in das PDF ein (PAdES-Standard)
- Lokale Kopie wird gespeichert (unveraenderbar, read-only Dateiattribut)
- Anzeige: "Rechtsgueltg signiert" mit Zertifikat-Details

### Sicherheitsarchitektur

```
bit.LOCK (lokal)                    bit.SIGN (Server)
─────────────────                   ──────────────────
1. PDF laden
2. Hash berechnen (SHA-256)
3. Hash senden ──────────────────→  4. Hash mit Zertifikat signieren
                                    5. Signatur + Zertifikatskette
                              ←──── 6. Zuruecksenden
7. Signatur in PDF einbetten
8. Lokale Kopie speichern
```

**Wichtig:** Das PDF verlässt NIEMALS das lokale Gerät. Nur der Hash (32 Bytes) wird übertragen.
Das ist konsistent mit dem Zero-Knowledge-Prinzip von bit.LOCK.

### Lokale Kopie (unveraenderbar)

- Signiertes PDF wird in einem dedizierten Ordner gespeichert
  - macOS: `~/Library/Application Support/de.birklein.bit-lock/signed/`
  - Windows: `%APPDATA%/de.birklein.bit-lock/signed/`
- Datei wird read-only gesetzt (chmod 444 / attrib +R)
- Enthaelt: Original-PDF + eingebettete PAdES-Signatur + Zertifikatskette
- In der Verlauf-Ansicht als "Signiert" markiert mit Zertifikat-Info

## Technische Architektur

### Neue Rust Crates

| Crate | Zweck | Lizenz |
|---|---|---|
| `reqwest` | HTTP Client fuer bit.SIGN API | MIT/Apache-2.0 |
| `oauth2` | OAuth2 PKCE Flow | MIT/Apache-2.0 |
| `sha2` | PDF-Hash berechnen (bereits vorhanden) | MIT/Apache-2.0 |

### PDF-Signatur-Einbettung

Die eigentliche Signatur-Einbettung (PAdES) ist komplex:
- Signatur-Platzhalter im PDF erstellen (ByteRange)
- CMS/PKCS#7 Signatur-Container einbetten
- Option: `lopdf` fuer Grundstruktur + manuelles CMS-Handling
- Alternative: `pdf-sign` Crate (falls verfuegbar und kompatibel)

### API-Endpunkte (bit.SIGN Seite)

```
POST /api/v1/auth/token          — OAuth2 Token Exchange
GET  /api/v1/certificates/active — Aktives Zertifikat des Tenants abrufen
POST /api/v1/sign/hash           — Hash signieren lassen
GET  /api/v1/sign/{id}/status    — Signatur-Status pruefen
```

### Neue Tauri Commands

```rust
#[tauri::command]
async fn bitsign_login(auth_code: String) -> Result<SignSession, String>

#[tauri::command]
async fn bitsign_logout() -> Result<(), String>

#[tauri::command]
async fn bitsign_get_certificate() -> Result<CertificateInfo, String>

#[tauri::command]
async fn bitsign_sign_pdf(input_path: String, reason: String) -> Result<SignResult, String>

#[tauri::command]
async fn bitsign_status() -> Result<Option<SignSession>, String>
```

### Frontend-Komponenten

- `SignFlow.jsx` — 3-Step Signatur-Wizard
- `SignLoginDialog.jsx` — OAuth2 Login (öffnet Browser, wartet auf Callback)
- Sidebar: "Signieren" Nav-Eintrag (nur wenn aktiviert + eingeloggt)
- Einstellungen: "Integrationen" Sektion mit bit.SIGN Toggle + Account-Info

## Acceptance Criteria

- [ ] OAuth2 PKCE Login gegen bit.SIGN API funktioniert
- [ ] Zertifikat-Info wird korrekt angezeigt (Inhaber, Gueltigkeit)
- [ ] PDF-Hash wird lokal berechnet, nur Hash wird an API gesendet
- [ ] Signatur wird korrekt in PDF eingebettet (PAdES-konform)
- [ ] Signiertes PDF ist in Adobe Acrobat als "gueltig signiert" erkennbar
- [ ] Lokale Kopie ist read-only und enthaelt vollstaendige Zertifikatskette
- [ ] Token-Refresh funktioniert automatisch
- [ ] Graceful Handling bei: Netzwerk-Fehler, abgelaufenem Token, ungueltigem Zertifikat
- [ ] Integration ist komplett optional — bit.LOCK funktioniert ohne bit.SIGN

## Edge Cases

- Zertifikat abgelaufen: Warnung anzeigen, Signatur verweigern
- Netzwerk-Fehler waehrend Signatur: Retry mit Idempotency-Key
- Tenant-Lizenz abgelaufen: Klare Fehlermeldung + Link zu bit.SIGN
- Bereits signiertes PDF: Warnung "Dokument hat bereits eine Signatur — weitere hinzufuegen?"
- Verschluesseltes PDF signieren: Erst entschluesseln → signieren → optional neu verschluesseln
