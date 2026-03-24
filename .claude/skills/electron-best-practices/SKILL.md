# Electron Best Practices

## Rolle
Du bist ein Experte für Electron-Desktop-Apps mit Fokus auf Sicherheit, Cross-Platform-Kompatibilität, Performance und reibungslose Funktion unter Windows und macOS.

## Ausführung
- **Modus:** Inline (direkt im Chat)
- **Context7 PFLICHT:** Vor jeder Implementierung Context7 für aktuelle Electron-Docs aufrufen
- **Human-in-the-Loop:** Ja — Review bei Security-Entscheidungen + Build-Config

## Context7 zuerst (IMMER)

Bevor du Code schreibst:
```
/context7 electron           → IPC, BrowserWindow, app lifecycle
/context7 electron-builder   → Packaging, Signing, Auto-Update
/context7 better-sqlite3     → Falls lokale DB genutzt wird
```

## Kontext laden

1. `CLAUDE.md` → Tech-Stack, Build-Commands, Non-Negotiables
2. `.claude/rules/desktop.md` → Cross-Platform, Sicherheit, Performance
3. `package.json` → Electron-Version, electron-builder Config
4. `electron-builder.yml` oder `build` in package.json → Build-Konfiguration

## Sicherheitshärtung (Blocking Gate)

Jede Electron-App MUSS:

| Regel | Wert | Warum |
|-------|------|-------|
| `nodeIntegration` | `false` | Renderer darf keinen Node.js-Zugriff haben |
| `contextIsolation` | `true` | Preload-Script ist die einzige Brücke |
| `sandbox` | `true` | Renderer in OS-Sandbox |
| `webSecurity` | `true` | Same-Origin-Policy aktiv |
| `allowRunningInsecureContent` | `false` | Kein Mixed Content |
| Remote-Modul | deaktiviert | Deprecated und unsicher |
| CSP | gesetzt | `Content-Security-Policy` im HTML-Header |

### IPC-Sicherheit
```typescript
// ✅ Korrekt: invoke/handle Pattern (Promise-basiert)
ipcMain.handle('channel:action', async (_event, input) => {
  const parsed = schema.safeParse(input)  // Zod-Validierung
  if (!parsed.success) throw new Error('Invalid input')
  return doSomething(parsed.data)
})

// ❌ Verboten: ipcMain.on mit event.reply (kein Error-Handling)
// ❌ Verboten: Unkontrollierte Channels ohne Validierung
```

## Cross-Platform Reibungslosigkeit

### Windows-spezifisch
- **Pfade:** `path.join()` statt String-Concatenation (Backslash-Problem)
- **Registry:** Für File-Associations über electron-builder konfigurieren, nicht manuell
- **Tray-Icon:** 16x16px ICO-Format, nicht PNG
- **Autostart:** `app.setLoginItemSettings()` nutzen
- **Installer:** NSIS (Standard) oder MSI — beide via electron-builder
- **Code-Signing:** EV-Zertifikat für SmartScreen-Bypass
- **UAC:** Nicht als Admin ausführen — Standard-User-Rechte reichen

### macOS-spezifisch
- **Notarisierung:** Pflicht seit macOS 10.15 — via `electron-notarize`
- **Entitlements:** `com.apple.security.cs.allow-jit` für JIT, `com.apple.security.files.user-selected.read-write` für Dateizugriff
- **Menü:** Native Menüleiste mit Cmd-Shortcuts (nicht Ctrl)
- **Dock-Icon:** 512x512px ICNS
- **Dark Mode:** `nativeTheme.shouldUseDarkColors` respektieren
- **Universal Binary:** `--arch universal` für Apple Silicon + Intel

### Gemeinsam
```typescript
// OS-spezifischen Config-Pfad nutzen
import { app } from 'electron'
const configPath = app.getPath('userData')  // Automatisch korrekt pro OS

// Fenster-State persistent speichern
import Store from 'electron-store'
const store = new Store()
const windowState = store.get('windowState', { width: 800, height: 600 })
```

## Performance-Ziele

| Metrik | Ziel | Wie messen |
|--------|------|-----------|
| Startup | < 3 Sekunden | `app.on('ready')` Timestamp |
| Memory Idle | < 200 MB | Task Manager / Activity Monitor |
| Animation | 60 FPS | DevTools Performance Tab |
| IPC Latency | < 5 ms | `performance.now()` um invoke() |

### Performance-Patterns
- **Lazy Loading:** Module erst laden wenn gebraucht (`import()`)
- **Worker Threads:** CPU-intensive Arbeit (Verschlüsselung, Parsing) in Worker
- **Debounce:** Window-Resize und andere frequente Events debounzen
- **Event-Listener Cleanup:** `removeListener` / `removeAllListeners` bei Fenster-Close

## Build & Distribution

### electron-builder Konfiguration
```yaml
# electron-builder.yml
appId: de.birklein.appname
productName: AppName
directories:
  output: dist
mac:
  category: public.app-category.utilities
  hardenedRuntime: true
  gatekeeperAssess: false
  entitlements: build/entitlements.mac.plist
  entitlementsInherit: build/entitlements.mac.plist
  target:
    - target: dmg
      arch: [universal]
win:
  target:
    - target: nsis
      arch: [x64]
  signingHashAlgorithms: [sha256]
nsis:
  oneClick: false
  allowToChangeInstallationDirectory: true
```

## Qualitätskriterien

- [ ] Context7 konsultiert (Electron + Builder Docs)
- [ ] Sicherheits-Checkliste komplett bestanden
- [ ] Funktioniert unter Windows UND macOS
- [ ] Performance-Ziele erreicht (Startup < 3s, Memory < 200MB)
- [ ] IPC-Channels validiert (Zod oder vergleichbar)
- [ ] Keine hardcodierten Pfade
- [ ] Build erfolgreich (`npm run build`)
- [ ] Installer getestet (Windows: NSIS, macOS: DMG)
