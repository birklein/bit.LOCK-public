# bit.LOCK

Sichere PDF-Tools fuer den Desktop — Verschluesselung, Komprimierung, Zusammenfuehrung und digitale Signaturen.

![Tauri](https://img.shields.io/badge/Tauri-2.x-blue)
![License](https://img.shields.io/badge/License-GPL--3.0-green)
![Platform](https://img.shields.io/badge/Platform-macOS%20%7C%20Windows-lightgrey)

## Features

- **PDF-Verschluesselung** — AES-256-Verschluesselung mit qpdf, Passwort-Generierung, Versand per Mail
- **PDF-Komprimierung** — Dateigroesse reduzieren mit konfigurierbarer Qualitaet
- **PDF-Zusammenfuehrung** — Mehrere PDFs zu einer Datei kombinieren
- **Digitale Signaturen** — PKCS#7-Zertifikatsbasierte Signaturen ueber einen kompatiblen Signatur-Server (OAuth2 PKCE)
- **Verlauf** — Lokale Historie aller Operationen mit konfigurierbarer Aufbewahrungsdauer
- **Auto-Updates** — Integrierter Tauri-Updater

## Tech Stack

| Komponente | Technologie |
|---|---|
| Desktop Framework | Tauri 2 (Rust) |
| Frontend | React 18, Tailwind CSS |
| PDF-Verschluesselung | qpdf (gebundelte Binary) |
| Lokale Datenbank | SQLite (better-sqlite3 via rusqlite) |
| Kryptographie | AES-256-GCM (aes-gcm crate) |

## Voraussetzungen

- [Node.js](https://nodejs.org/) >= 18
- [Rust](https://rustup.rs/) (stable)
- [Tauri CLI](https://tauri.app/start/create-project/) (`npm install -g @tauri-apps/cli`)
- qpdf (wird als Binary in `src-tauri/binaries/` mitgeliefert)

## Development

```bash
# Dependencies installieren
npm install

# Dev-Server starten (Vite + Tauri)
npx tauri dev

# Production-Build
npx tauri build
```

## Architektur

```
src/                        Frontend (React)
  components/
    sign/                   Signatur-Flow (3 Schritte)
    EncryptView.jsx         PDF-Verschluesselung
    SettingsView.jsx        Einstellungen
    Sidebar.jsx             Navigation
src-tauri/                  Backend (Rust)
  src/
    encryption.rs           qpdf-Integration
    sign.rs                 OAuth2 + Signatur-API
    crypto.rs               AES-256-GCM Passwortverschluesselung
    settings.rs             SQLite Settings
    database.rs             Verlauf-Datenbank
```

## Signatur-Server

Die Signatur-Funktion setzt einen kompatiblen Signatur-Server voraus, der folgende API bereitstellt:

| Endpoint | Methode | Zweck |
|---|---|---|
| `/api/auth/oauth2/authorize` | GET | OAuth2 PKCE Login |
| `/api/v1/documents` | POST | PDF-Upload (Multipart) |
| `/api/v1/documents/{id}/sign` | POST | Signatur uebermitteln |
| `/api/v1/documents/{id}/send` | POST | Einladungen an externe Unterzeichner |
| `/api/v1/documents/{id}/signed-pdf` | GET | Signiertes PDF herunterladen |

## Sicherheit

- Alle PDFs werden lokal verarbeitet — keine Cloud-Verarbeitung
- Passwoerter werden mit AES-256-GCM verschluesselt in der lokalen SQLite-Datenbank gespeichert
- Der Verschluesselungsschluessel ist maschinengebunden (pro Installation generiert)
- OAuth2 PKCE fuer Signatur-Server-Authentifizierung (kein Client Secret)
- Kein Netzwerk-Zugriff ohne explizite User-Aktion

## Lizenz

GPL-3.0 — siehe [LICENSE](LICENSE)

Copyright (c) 2024-2026 birklein IT GmbH
