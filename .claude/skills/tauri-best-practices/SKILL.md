# Tauri 2 Best Practices

## Rolle
Du bist ein Experte für Tauri 2 Desktop-Apps mit Fokus auf Sicherheit, Cross-Platform-Kompatibilität (Windows + macOS), Performance und das Rust-Backend/Web-Frontend-Modell.

## Ausführung
- **Modus:** Inline (direkt im Chat)
- **Context7 PFLICHT:** `/context7 tauri` vor jeder Implementierung
- **Human-in-the-Loop:** Ja — Review bei Permissions, Security-Entscheidungen + Build-Config

## Context7 zuerst (IMMER)

```
/context7 tauri              → Commands, API, Plugins, Konfiguration
/context7 tauri-plugin-*     → Für spezifische Plugins (updater, dialog, fs, etc.)
```

## Kontext laden

1. `CLAUDE.md` → Tech-Stack, Build-Commands, Non-Negotiables
2. `.claude/rules/desktop.md` → Cross-Platform, Sicherheit, Performance
3. `src-tauri/tauri.conf.json` → App-Konfiguration, Permissions, Plugins
4. `src-tauri/Cargo.toml` → Rust-Dependencies
5. `package.json` → Frontend-Dependencies

## Architektur: Rust-Backend + Web-Frontend

```
project/
├── src/                    ← Frontend (React/Vue/Svelte + TypeScript)
│   ├── App.tsx
│   └── lib/
├── src-tauri/              ← Rust-Backend
│   ├── src/
│   │   ├── main.rs         ← App-Lifecycle, Plugin-Registrierung
│   │   └── lib.rs          ← Custom Commands
│   ├── tauri.conf.json     ← Zentrale Konfiguration
│   ├── Cargo.toml          ← Rust-Dependencies
│   └── capabilities/       ← Permission-Dateien
└── package.json            ← Frontend-Build
```

### Command-System (Brücke Frontend ↔ Rust)

```rust
// src-tauri/src/lib.rs
#[tauri::command]
fn encrypt_pdf(path: String, password: String) -> Result<String, String> {
    // Rust-Logik: sicher, schnell, typsicher
    Ok("Verschlüsselt".to_string())
}

pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![encrypt_pdf])
        .run(tauri::generate_context!())
        .expect("Fehler beim Starten der App");
}
```

```typescript
// Frontend: Aufruf des Rust-Commands
import { invoke } from '@tauri-apps/api/core'

const result = await invoke<string>('encrypt_pdf', {
  path: '/pfad/zur/datei.pdf',
  password: 'geheim',
})
```

## Sicherheit (Capability-System)

Tauri 2 nutzt ein **explizites Permission-System** — nichts ist standardmäßig erlaubt.

### Capabilities definieren
```json
// src-tauri/capabilities/main.json
{
  "identifier": "main-capability",
  "description": "Hauptfenster-Berechtigungen",
  "windows": ["main"],
  "permissions": [
    "core:default",
    "dialog:default",
    "fs:read-files",
    "fs:write-files",
    "updater:default"
  ]
}
```

### Sicherheits-Checkliste (Blocking Gate)

- [ ] **Keine `allow-all` Permissions** — nur was tatsächlich benötigt wird
- [ ] **CSP gesetzt** in `tauri.conf.json` → `security.csp`
- [ ] **Kein `dangerousRemoteDomainIpcAccess`** ohne Begründung
- [ ] **Custom Commands validieren Input** (serde-Typen erzwingen Typensicherheit)
- [ ] **Dateizugriff eingeschränkt** auf benötigte Scopes (`fs:allow-*-read`)
- [ ] **Keine Klartext-Secrets** — `tauri-plugin-keyring` für OS-Keychain nutzen

## Cross-Platform Reibungslosigkeit

### Windows-spezifisch
- **WebView2:** Wird automatisch installiert (Evergreen Runtime)
- **Installer:** NSIS oder WiX via `tauri-bundler` — konfiguriert in `tauri.conf.json`
- **Code-Signing:** OV/EV-Zertifikat + `relic` für Azure Key Vault
- **Pfade:** Rust's `std::path::PathBuf` ist automatisch cross-platform
- **Autostart:** `tauri-plugin-autostart`

### macOS-spezifisch
- **Notarisierung:** Pflicht — `APPLE_SIGNING_IDENTITY` + `APPLE_ID` + `APPLE_PASSWORD` + `APPLE_TEAM_ID`
- **Entitlements:** In `src-tauri/entitlements.plist`
- **Universal Binary:** `--target universal-apple-darwin` beim Build
- **Dark Mode:** Automatisch via WebView (CSS `prefers-color-scheme`)
- **Menüleiste:** Native via `tauri::menu::Menu`

### Gemeinsam
```rust
// Plattform-spezifischer Config-Pfad (automatisch korrekt)
let app_dir = app.path().app_data_dir().expect("App-Datenverzeichnis");
// macOS: ~/Library/Application Support/de.birklein.appname/
// Windows: C:\Users\X\AppData\Roaming\de.birklein.appname\
// Linux: ~/.local/share/de.birklein.appname/
```

## Performance-Vorteile (vs Electron)

| Metrik | Tauri 2 | Electron |
|--------|---------|----------|
| Installer-Größe | ~2,5 MB | ~85 MB |
| Memory Idle | 30–40 MB | 150–200 MB |
| Startup | < 0,5 Sekunden | 1–3 Sekunden |
| Bundle | Kein Chromium | Chromium gebundled |

### Performance-Patterns
- **Rust für CPU-intensive Arbeit:** Verschlüsselung, Parsing, Bildverarbeitung → Rust-Command
- **Async Commands:** `#[tauri::command] async fn` für I/O-Operationen
- **Sidecar:** Externe Binaries via `tauri-plugin-shell` (z.B. qpdf, ffmpeg)
- **Events statt Polling:** `app.emit()` und `window.listen()` für Echtzeit-Updates

## Build & Distribution

```bash
# Development
npm run tauri dev              # Frontend + Rust Hot-Reload

# Production Build
npm run tauri build            # .dmg + .exe + .deb/.AppImage
npm run tauri build -- --target universal-apple-darwin  # macOS Universal

# Mit Signing (CI/CD)
APPLE_SIGNING_IDENTITY="Developer ID Application: birklein IT"
TAURI_SIGNING_PRIVATE_KEY="..."  # Für Update-Signaturen
npm run tauri build
```

### tauri.conf.json Essentials
```json
{
  "productName": "bit.LOCK",
  "identifier": "de.birklein.bit-lock",
  "build": {
    "frontendDist": "../dist"
  },
  "bundle": {
    "active": true,
    "targets": "all",
    "icon": ["icons/icon.png"],
    "macOS": {
      "signingIdentity": null,
      "entitlements": "entitlements.plist"
    },
    "windows": {
      "certificateThumbprint": null,
      "nsis": { "oneClick": false }
    }
  },
  "security": {
    "csp": "default-src 'self'; style-src 'self' 'unsafe-inline'"
  }
}
```

## Qualitätskriterien

- [ ] Context7 konsultiert (Tauri + Plugin Docs)
- [ ] Capabilities minimal definiert (kein `allow-all`)
- [ ] CSP gesetzt und getestet
- [ ] Custom Commands validieren Input via Rust-Typen
- [ ] Funktioniert unter Windows UND macOS
- [ ] Bundle-Größe < 10 MB
- [ ] Memory Idle < 50 MB
- [ ] Build erfolgreich (`npm run tauri build`)
- [ ] Installer getestet (Windows: NSIS, macOS: DMG)
