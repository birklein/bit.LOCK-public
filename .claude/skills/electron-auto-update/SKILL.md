# Electron Auto-Update

## Rolle
Du bist ein Experte für Auto-Update-Systeme in Electron-Apps. Du implementierst sichere, zuverlässige Update-Mechanismen die unter Windows und macOS reibungslos funktionieren.

## Ausführung
- **Modus:** Inline (direkt im Chat)
- **Context7 PFLICHT:** `/context7 electron-updater` und `/context7 electron-builder` vor jeder Implementierung
- **Human-in-the-Loop:** Ja — Update-Strategie + Release-Workflow brauchen Freigabe

## Context7 zuerst (IMMER)

```
/context7 electron-updater    → autoUpdater API, Events, Konfiguration
/context7 electron-builder    → publish-Konfiguration, Code-Signing, Notarisierung
```

## Workflow

### 1. Update-Strategie festlegen

Frage den User:
- **Update-Server:** GitHub Releases, S3, eigener Server, oder IONOS?
- **Update-Modus:** Silent (automatisch im Hintergrund) oder mit User-Bestätigung?
- **Rollback:** Automatisch bei Crash nach Update oder manuell?
- **Channels:** Nur Stable, oder auch Beta?
- **Differenzielle Updates:** Volle Downloads oder Delta-Updates (blockmap)?

### 2. Implementierung: electron-updater

```typescript
// src/main/updater.ts
import { autoUpdater } from 'electron-updater'
import { app, dialog, BrowserWindow } from 'electron'
import log from 'electron-log'

// Logging einrichten
autoUpdater.logger = log
autoUpdater.autoDownload = false       // User entscheidet
autoUpdater.autoInstallOnAppQuit = true

export function initAutoUpdater(mainWindow: BrowserWindow): void {
  // Update verfügbar
  autoUpdater.on('update-available', (info) => {
    log.info(`Update verfügbar: ${info.version}`)
    mainWindow.webContents.send('update:available', {
      version: info.version,
      releaseNotes: info.releaseNotes,
    })
  })

  // Kein Update
  autoUpdater.on('update-not-available', () => {
    log.info('Kein Update verfügbar')
  })

  // Download-Fortschritt
  autoUpdater.on('download-progress', (progress) => {
    mainWindow.webContents.send('update:progress', {
      percent: Math.round(progress.percent),
      bytesPerSecond: progress.bytesPerSecond,
    })
  })

  // Download fertig
  autoUpdater.on('update-downloaded', (info) => {
    log.info(`Update heruntergeladen: ${info.version}`)
    mainWindow.webContents.send('update:downloaded', {
      version: info.version,
    })
  })

  // Fehler
  autoUpdater.on('error', (error) => {
    log.error('Update-Fehler:', error)
    mainWindow.webContents.send('update:error', {
      message: error.message,
    })
  })

  // Prüfung starten (nicht beim Start blockierend!)
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch((err) => {
      log.error('Update-Check fehlgeschlagen:', err)
    })
  }, 10_000) // 10s nach App-Start
}

// Vom Renderer aufgerufen via IPC
export function downloadUpdate(): void {
  autoUpdater.downloadUpdate()
}

export function installUpdate(): void {
  autoUpdater.quitAndInstall(false, true)
  // false = kein Silent-Mode, true = forceRunAfter
}
```

### 3. IPC-Channels registrieren

```typescript
// src/main/index.ts
import { ipcMain } from 'electron'
import { downloadUpdate, installUpdate } from './updater'

ipcMain.handle('update:download', () => downloadUpdate())
ipcMain.handle('update:install', () => installUpdate())
ipcMain.handle('update:check', () => autoUpdater.checkForUpdates())
```

### 4. Preload-Script erweitern

```typescript
// src/preload/index.ts
contextBridge.exposeInMainWorld('updater', {
  onAvailable: (cb: (info: UpdateInfo) => void) =>
    ipcRenderer.on('update:available', (_e, info) => cb(info)),
  onProgress: (cb: (progress: ProgressInfo) => void) =>
    ipcRenderer.on('update:progress', (_e, p) => cb(p)),
  onDownloaded: (cb: (info: UpdateInfo) => void) =>
    ipcRenderer.on('update:downloaded', (_e, info) => cb(info)),
  onError: (cb: (err: ErrorInfo) => void) =>
    ipcRenderer.on('update:error', (_e, err) => cb(err)),
  download: () => ipcRenderer.invoke('update:download'),
  install: () => ipcRenderer.invoke('update:install'),
  check: () => ipcRenderer.invoke('update:check'),
})
```

### 5. UI-Komponente (React)

```tsx
// src/renderer/components/UpdateBanner.tsx
'use client'
import { useState, useEffect } from 'react'

type UpdateState = 'idle' | 'available' | 'downloading' | 'ready' | 'error'

export function UpdateBanner() {
  const [state, setState] = useState<UpdateState>('idle')
  const [version, setVersion] = useState('')
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    window.updater.onAvailable((info) => {
      setVersion(info.version)
      setState('available')
    })
    window.updater.onProgress((p) => {
      setProgress(p.percent)
      setState('downloading')
    })
    window.updater.onDownloaded(() => setState('ready'))
    window.updater.onError(() => setState('error'))
  }, [])

  if (state === 'idle') return null

  return (
    <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg border p-4 max-w-sm">
      {state === 'available' && (
        <>
          <p className="text-sm font-medium">Version {version} verfügbar</p>
          <button
            onClick={() => window.updater.download()}
            className="mt-2 px-3 py-1 bg-blue-600 text-white rounded text-sm"
          >
            Jetzt aktualisieren
          </button>
        </>
      )}
      {state === 'downloading' && (
        <>
          <p className="text-sm">Wird heruntergeladen… {progress}%</p>
          <div className="mt-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-blue-600 transition-all" style={{ width: `${progress}%` }} />
          </div>
        </>
      )}
      {state === 'ready' && (
        <>
          <p className="text-sm font-medium">Update bereit</p>
          <button
            onClick={() => window.updater.install()}
            className="mt-2 px-3 py-1 bg-green-600 text-white rounded text-sm"
          >
            Jetzt neu starten
          </button>
        </>
      )}
      {state === 'error' && (
        <p className="text-sm text-red-600">Update-Fehler. Bitte später erneut versuchen.</p>
      )}
    </div>
  )
}
```

### 6. electron-builder Publish-Konfiguration

```yaml
# electron-builder.yml — GitHub Releases
publish:
  provider: github
  owner: birklein-it
  repo: app-name
  releaseType: release

# Für eigenen Server (z.B. IONOS):
# publish:
#   provider: generic
#   url: https://updates.birklein.de/app-name
```

### 7. Release-Workflow

```bash
# Version bumpen (semantic versioning)
npm version patch    # Bugfix: 1.0.0 → 1.0.1
npm version minor    # Feature: 1.0.0 → 1.1.0
npm version major    # Breaking: 1.0.0 → 2.0.0

# Build + Publish
npm run build        # Electron-Builder: .dmg + .exe + latest.yml
# → GitHub Release erstellen oder auf Update-Server hochladen
```

### 8. Rollback-Strategie

```typescript
// Crash-Detection nach Update
const CRASH_THRESHOLD = 3
const store = new Store()

app.on('ready', () => {
  const crashes = store.get('crashCount', 0) as number
  const lastVersion = store.get('lastStableVersion', '') as string

  if (crashes >= CRASH_THRESHOLD && lastVersion) {
    log.error(`${crashes} Crashes nach Update — Rollback empfohlen`)
    dialog.showMessageBox({
      type: 'error',
      title: 'Stabilitätsproblem',
      message: `Die App ist ${crashes}x abgestürzt. Möchten Sie zur vorherigen Version zurückkehren?`,
      buttons: ['Zurücksetzen', 'Ignorieren'],
    }).then((result) => {
      if (result.response === 0) {
        autoUpdater.setFeedURL({ url: `https://updates.birklein.de/rollback/${lastVersion}` })
        autoUpdater.checkForUpdates()
      }
    })
  }

  // Crash-Counter bei sauberem Start zurücksetzen
  setTimeout(() => store.set('crashCount', 0), 30_000)
})

process.on('uncaughtException', () => {
  store.set('crashCount', (store.get('crashCount', 0) as number) + 1)
})
```

## Plattform-spezifische Hinweise

### Windows
- **Code-Signing:** EV-Zertifikat verhindert SmartScreen-Warnung
- **NSIS:** `oneClick: false` für Installation-Pfad-Auswahl
- **Delta-Updates:** `differentialDownload: true` in electron-builder (blockmap)

### macOS
- **Notarisierung:** Pflicht — `afterSign` Hook in electron-builder
- **Hardened Runtime:** `hardenedRuntime: true` in mac-Config
- **Entitlements:** `com.apple.security.cs.allow-jit` für Auto-Update

## Qualitätskriterien

- [ ] Context7 konsultiert (electron-updater + electron-builder Docs)
- [ ] Update-Check nicht blockierend (>5s Delay nach Start)
- [ ] User wird informiert, nicht gezwungen (außer kritische Security-Updates)
- [ ] Download-Fortschritt sichtbar in UI
- [ ] Rollback-Mechanismus bei wiederholten Crashes
- [ ] Code-Signing konfiguriert (Windows + macOS)
- [ ] Notarisierung konfiguriert (macOS)
- [ ] Release-Workflow dokumentiert
- [ ] `latest.yml` / `latest-mac.yml` wird korrekt generiert
