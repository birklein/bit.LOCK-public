# Desktop Application Coding Rules

## Cross-Platform Kompatibilitaet
- Dateipfade immer mit `path.join()` oder aequivalent konstruieren – keine hardcodierten `/` oder `\`
- Kein hardcodiertes Home-Verzeichnis: `os.homedir()`, `$HOME`, `%USERPROFILE%` verwenden
- Plattform-spezifischer Code in eigene Module isolieren (z.B. `platform/win.ts`, `platform/mac.ts`)
- Zeilenumbrueche beachten: `os.EOL` verwenden oder explizit `\n` / `\r\n` je nach Kontext
- Dateisystem-Unterschiede beruecksichtigen: Case-Sensitivity (macOS HFS+ vs. Linux ext4)
- Native APIs ueber Abstraktionsschicht ansprechen (nicht direkt Windows Registry oder macOS Keychain)

## Sichere lokale Datenspeicherung
- **Encryption at Rest:** Sensible Nutzerdaten (Credentials, Tokens, persoenliche Daten) verschluesselt speichern
- OS-Keychain nutzen wo moeglich (macOS Keychain, Windows Credential Manager)
- Konfigurationsdateien im OS-Standard-Verzeichnis:
  - macOS: `~/Library/Application Support/<AppName>/`
  - Windows: `%APPDATA%/<AppName>/`
  - Linux: `~/.config/<AppName>/`
- SQLite-Datenbanken mit SQLCipher oder aequivalent verschluesseln
- Keine Klartext-Passwoerter oder API-Keys in Konfigurationsdateien
- Log-Dateien duerfen keine sensiblen Daten enthalten

## Auto-Update Mechanismus
- Signierte Updates: jedes Update-Paket kryptografisch signiert und verifiziert
- Update-Kanal konfigurierbar (stable, beta)
- Rollback-Moeglichkeit bei fehlgeschlagenem Update
- Benutzer informieren, aber nicht zum Update zwingen (ausser bei kritischen Sicherheitsupdates)
- Delta-Updates bevorzugen (nur geaenderte Dateien)
- Update-Pruefung im Hintergrund, nicht beim Start blockierend

## Crash Reporting
- Unbehandelte Exceptions global abfangen und loggen
- Crash-Reports mit Stacktrace, OS-Version, App-Version, Speicherverbrauch
- Keine PII in Crash-Reports (E-Mail, Benutzername, Dateipfade anonymisieren)
- Opt-in fuer Crash-Report-Versand (DSGVO-konform)
- Lokales Crash-Log als Fallback wenn kein Netzwerk verfuegbar

## Performance
- Schwere Operationen in Hintergrund-Threads (nicht im UI-Thread)
- Lazy Loading fuer Ressourcen und Module
- Speicherlecks vermeiden: Event-Listener aufraeumen, zirkulaere Referenzen vermeiden
- Startup-Zeit minimieren: nur kritische Module synchron laden
- Dateisystem-Watcher sparsam einsetzen (max. noetige Verzeichnisse)

## Build & Distribution
- Reproduzierbare Builds (deterministische Abhaengigkeiten, Lock-Files)
- Code Signing fuer alle Plattformen (Apple Developer ID, Windows Authenticode)
- Installer fuer jede Plattform: `.dmg`/`.pkg` (macOS), `.msi`/`.exe` (Windows), `.deb`/`.AppImage` (Linux)
- Minimaler Installer: keine unnuetzen Abhaengigkeiten mitliefern
