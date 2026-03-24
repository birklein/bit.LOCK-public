# Tauri 2 Auto-Update

## Rolle
Du bist ein Experte für das Tauri 2 Update-System (`tauri-plugin-updater`). Du implementierst sichere, signaturbasierte Auto-Updates die unter Windows und macOS reibungslos funktionieren.

## Ausführung
- **Modus:** Inline (direkt im Chat)
- **Context7 PFLICHT:** `/context7 tauri` vor jeder Implementierung
- **Human-in-the-Loop:** Ja — Update-Strategie + Signing-Keys brauchen Freigabe

## Context7 zuerst (IMMER)

```
/context7 tauri                → Allgemeine Konfiguration
/context7 tauri-plugin-updater → Update-API, Events, Konfiguration
```

## Workflow

### 1. Update-Strategie festlegen

Frage den User:
- **Update-Server:** GitHub Releases, statischer Server (IONOS), oder S3?
- **Update-Modus:** User-bestätigt oder silent im Hintergrund?
- **Kanäle:** Nur Stable, oder auch Beta/Nightly?

### 2. Signing-Keys generieren

**Pflicht** — Tauri-Updates MÜSSEN signiert sein (keine Option zum Deaktivieren).

```bash
# Einmalig: Schlüsselpaar generieren
npx @tauri-apps/cli signer generate -w ~/.tauri/myapp.key

# Erzeugt:
# ~/.tauri/myapp.key      ← Privater Schlüssel (GEHEIM, nie committen!)
# ~/.tauri/myapp.key.pub  ← Öffentlicher Schlüssel (in tauri.conf.json)
```

**Passwort merken!** Wird bei jedem Build gebraucht.

### 3. tauri.conf.json konfigurieren

```json
{
  "plugins": {
    "updater": {
      "pubkey": "INHALT_VON_myapp.key.pub",
      "endpoints": [
        "https://github.com/birklein-it/APP_NAME/releases/latest/download/latest.json"
      ],
      "windows": {
        "installMode": "passive"
      }
    }
  }
}
```

**Endpoint-Formate:**

```
// GitHub Releases (einfachster Weg)
https://github.com/OWNER/REPO/releases/latest/download/latest.json

// Eigener Server (IONOS etc.)
https://updates.birklein.de/app-name/latest.json

// S3/R2
https://bucket.s3.eu-central-1.amazonaws.com/app-name/latest.json
```

### 4. Plugin registrieren (Rust)

```rust
// src-tauri/src/lib.rs
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .setup(|app| {
            // Optional: Update-Check im Hintergrund
            let handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                // 10s warten damit UI zuerst lädt
                tokio::time::sleep(std::time::Duration::from_secs(10)).await;
                if let Err(e) = update_check(handle).await {
                    eprintln!("Update-Check fehlgeschlagen: {e}");
                }
            });
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("Fehler beim Starten");
}

async fn update_check(app: tauri::AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let updater = app.updater_builder().build()?;
    if let Some(update) = updater.check().await? {
        println!("Update verfügbar: {}", update.version);
        // Dem Frontend mitteilen
        app.emit("update-available", &update.version)?;
    }
    Ok(())
}
```

### 5. Cargo.toml Dependencies

```toml
[dependencies]
tauri-plugin-updater = "2"
tokio = { version = "1", features = ["time"] }
```

### 6. Capabilities erweitern

```json
// src-tauri/capabilities/main.json
{
  "permissions": [
    "core:default",
    "updater:default",
    "updater:allow-check",
    "updater:allow-download-and-install"
  ]
}
```

### 7. Frontend-Integration (TypeScript)

```typescript
// src/lib/updater.ts
import { check } from '@tauri-apps/plugin-updater'
import { relaunch } from '@tauri-apps/plugin-process'

export type UpdateState =
  | { status: 'idle' }
  | { status: 'checking' }
  | { status: 'available'; version: string }
  | { status: 'downloading'; progress: number }
  | { status: 'ready'; version: string }
  | { status: 'error'; message: string }

export async function checkForUpdate(
  onState: (state: UpdateState) => void
): Promise<void> {
  onState({ status: 'checking' })

  try {
    const update = await check()

    if (!update) {
      onState({ status: 'idle' })
      return
    }

    onState({ status: 'available', version: update.version })

    // Warten auf User-Bestätigung (oder automatisch starten)
    return // Caller entscheidet ob downloadAndInstall() aufgerufen wird
  } catch (error) {
    onState({ status: 'error', message: String(error) })
  }
}

export async function downloadAndInstall(
  onState: (state: UpdateState) => void
): Promise<void> {
  try {
    const update = await check()
    if (!update) return

    let downloaded = 0
    let contentLength = 0

    await update.downloadAndInstall((event) => {
      switch (event.event) {
        case 'Started':
          contentLength = event.data.contentLength ?? 0
          onState({ status: 'downloading', progress: 0 })
          break
        case 'Progress':
          downloaded += event.data.chunkLength
          const percent = contentLength > 0
            ? Math.round((downloaded / contentLength) * 100)
            : 0
          onState({ status: 'downloading', progress: percent })
          break
        case 'Finished':
          onState({ status: 'ready', version: update.version })
          break
      }
    })

    // Neustart mit Bestätigung
    await relaunch()
  } catch (error) {
    onState({ status: 'error', message: String(error) })
  }
}
```

### 8. React UI-Komponente

```tsx
// src/components/UpdateBanner.tsx
import { useState, useEffect } from 'react'
import { checkForUpdate, downloadAndInstall, type UpdateState } from '@/lib/updater'

export function UpdateBanner() {
  const [state, setState] = useState<UpdateState>({ status: 'idle' })

  useEffect(() => {
    // 10s nach Mount prüfen
    const timer = setTimeout(() => checkForUpdate(setState), 10_000)
    return () => clearTimeout(timer)
  }, [])

  if (state.status === 'idle' || state.status === 'checking') return null

  return (
    <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg border p-4 max-w-sm z-50">
      {state.status === 'available' && (
        <>
          <p className="text-sm font-medium">Version {state.version} verfügbar</p>
          <button
            onClick={() => downloadAndInstall(setState)}
            className="mt-2 px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
          >
            Jetzt aktualisieren
          </button>
        </>
      )}
      {state.status === 'downloading' && (
        <>
          <p className="text-sm">Wird heruntergeladen… {state.progress}%</p>
          <div className="mt-1.5 h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 transition-all duration-300"
              style={{ width: `${state.progress}%` }}
            />
          </div>
        </>
      )}
      {state.status === 'ready' && (
        <p className="text-sm font-medium text-green-700">
          Update installiert — App wird neu gestartet…
        </p>
      )}
      {state.status === 'error' && (
        <p className="text-sm text-red-600">
          Update fehlgeschlagen. Bitte später erneut versuchen.
        </p>
      )}
    </div>
  )
}
```

### 9. Build mit Signing

```bash
# Env-Variablen setzen (CI/CD oder lokal)
export TAURI_SIGNING_PRIVATE_KEY="$(cat ~/.tauri/myapp.key)"
export TAURI_SIGNING_PRIVATE_KEY_PASSWORD="dein-passwort"

# Build erzeugt signierte Installer + latest.json / latest.json.sig
npm run tauri build
```

**Output:**
```
src-tauri/target/release/bundle/
├── macos/
│   ├── AppName.app.tar.gz       ← Update-Paket (signiert)
│   └── AppName.app.tar.gz.sig   ← Signatur
├── nsis/
│   ├── AppName_x64-setup.nsis.zip      ← Update-Paket (signiert)
│   └── AppName_x64-setup.nsis.zip.sig  ← Signatur
└── latest.json                  ← Manifest für Updater
```

### 10. latest.json Format (automatisch generiert)

```json
{
  "version": "1.2.0",
  "notes": "Bugfixes und Performance-Verbesserungen",
  "pub_date": "2026-03-23T12:00:00Z",
  "platforms": {
    "darwin-aarch64": {
      "signature": "...",
      "url": "https://github.com/.../AppName.app.tar.gz"
    },
    "darwin-x86_64": {
      "signature": "...",
      "url": "https://github.com/.../AppName.app.tar.gz"
    },
    "windows-x86_64": {
      "signature": "...",
      "url": "https://github.com/.../AppName_x64-setup.nsis.zip"
    }
  }
}
```

### 11. Windows-Besonderheit: Install-Mode

```json
// tauri.conf.json
"plugins": {
  "updater": {
    "windows": {
      "installMode": "passive"
      // "passive" → Zeigt Fortschritt, kein User-Klick nötig
      // "basicUi" → Minimaler Dialog
      // "quiet" → Komplett silent (kein UI)
    }
  }
}
```

**Achtung:** Windows kann NICHT im laufenden Betrieb updaten — App muss neugestartet werden. macOS kann im Hintergrund aktualisieren.

## Release-Workflow

```bash
# 1. Version bumpen
# In src-tauri/tauri.conf.json: "version": "1.2.0"
# In package.json: "version": "1.2.0"

# 2. Build
TAURI_SIGNING_PRIVATE_KEY="..." npm run tauri build

# 3. GitHub Release erstellen
gh release create v1.2.0 \
  src-tauri/target/release/bundle/macos/*.tar.gz \
  src-tauri/target/release/bundle/macos/*.sig \
  src-tauri/target/release/bundle/nsis/*.zip \
  src-tauri/target/release/bundle/nsis/*.sig \
  --title "v1.2.0" \
  --notes "Bugfixes und Performance"

# 4. latest.json hochladen (automatisch im Bundle enthalten)
```

## Qualitätskriterien

- [ ] Context7 konsultiert (Tauri + Plugin-Updater Docs)
- [ ] Signing-Keys generiert und sicher aufbewahrt (nicht im Repo!)
- [ ] Public Key in `tauri.conf.json` korrekt eingetragen
- [ ] Update-Endpoint erreichbar und korrekt konfiguriert
- [ ] `latest.json` wird beim Build automatisch erzeugt
- [ ] Signatur-Verifikation funktioniert (Tauri erzwingt das)
- [ ] UI zeigt Update-Status (available → downloading → ready)
- [ ] Windows: Install-Mode konfiguriert (passive/basicUi/quiet)
- [ ] macOS: Notarisierung aktiv für Update-Pakete
- [ ] Release-Workflow dokumentiert und getestet
