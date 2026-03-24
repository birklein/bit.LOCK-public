# CLAUDE.md – bit.LOCK

## Projekt
bit.LOCK ist eine Desktop-App fuer sichere PDF-Verschluesselung (Behoerdenkommunikation).

## Tech Stack
- Electron · Vite · TypeScript · React 18 · Tailwind CSS
- PDF-Verschluesselung: qpdf
- Lokale Datenbank: better-sqlite3

## Commands
```bash
npm run dev
npm run build
npm run test
```

## Non-Negotiables (bit.LOCK-spezifisch)
- Alle PDFs lokal verschluesselt — keine Cloud-Verarbeitung
- Kein Netzwerk-Zugriff ohne explizite User-Aktion
- Lokale Datenbank fuer Empfaengerverwaltung

---

## Workspace-Integration

Dieses Projekt ist Teil des **birklein IT ai-workspace**.
Der Agent MUSS bei jeder Session folgende Dateien kennen:

| Datei | Inhalt | Wann lesen |
|---|---|---|
| `~/ai-workspace/CLAUDE.md` | Feature-Workflow, Regeln, Guards, Feedback-Loop | Session-Start (automatisch) |
| `~/ai-workspace/REGISTRY.md` | Alle Projekte, Profile, Changelog | Bei Projektanlage, Deploy |
| `~/ai-workspace/_templates/TECH-STACKS.md` | Aktuelle Standard-Stacks, Infrastruktur | Bei Tech-Entscheidungen |

### Feedback-Pflicht
Am Ende jeder bedeutenden Änderung prüfen:
- Wurde etwas gebaut das auch für andere Projekte nützlich ist? → User fragen → Template aktualisieren
- Neues Projekt angelegt? → `REGISTRY.md` aktualisieren

### Skills

| Skill | Aufruf | Zweck |
|---|---|---|
| Requirements Engineer | `/requirements` | Feature-Specs erstellen |
| Solution Architect | `/architecture` | Tech Design entwerfen |
| Frontend Developer | `/frontend` | UI implementieren |
| Backend Developer | `/backend` | API + DB implementieren |
| QA Engineer | `/qa` | Features testen |
| DevOps | `/deploy` | Deployment durchführen |
| Help | `/help` | Status + Orientierung |
