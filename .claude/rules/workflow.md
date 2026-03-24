---
description: Automatische Workflow-Regeln für alle Dateien — globale Skills, Context7, Qualitätssicherung
globs: "**/*.{ts,tsx,js,jsx,py,sh,sql,prisma,css,json}"
---

# Workflow-Automatisierung

Diese Regeln gelten automatisch bei jeder Code-Änderung. Du musst sie nicht manuell aufrufen.

## Context7 — Pflicht bei Tech-Entscheidungen

Bevor du eine Library, ein Pattern oder eine API verwendest die du nicht im aktuellen Projekt gesehen hast:
- **Rufe `/context7` auf** um die aktuelle Dokumentation abzurufen
- Das gilt für: Prisma-Queries, Next.js-APIs, Tailwind-Klassen, Zod-Schemas, React-Patterns
- Nutze NICHT dein Vorwissen wenn es um spezifische API-Signaturen geht — verifiziere immer

## Verification — Pflicht vor Completion

Bevor du sagst "fertig" oder einen Commit vorschlägst:
- **Führe die Verifikation durch** — nicht behaupten, beweisen
- `npm run type-check` muss grün sein
- `npm run lint` muss grün sein
- `npm run build` muss grün sein (bei größeren Änderungen)
- Wenn Tests existieren: `npm run test` ausführen

## Simplify — Nach größeren Features

Wenn du >3 Dateien geändert hast oder >100 Zeilen Code geschrieben:
- Prüfe ob Code vereinfacht werden kann
- Gibt es Duplikate die extrahiert werden können?
- Können bestehende Helpers wiederverwendet werden?
- Ist der Code so einfach wie möglich?

## Systematic Debugging — Bei Fehlern

Wenn ein Test fehlschlägt oder ein Build-Error auftritt:
- **Nicht raten** — analysiere die Ursache systematisch
- Lies den vollständigen Error-Output
- Prüfe ob die Ursache im aktuellen Code oder einer Dependency liegt
- Hypothese formulieren → testen → bestätigen/verwerfen

## Excalidraw — Bei Architektur-Visualisierung

Wenn ein User nach einem Diagramm, Prozess-Flow oder Architektur-Übersicht fragt:
- Nutze den `/excalidraw-diagram` Skill für interaktive Diagramme

## Playwright — Bei UI-Testing

Wenn End-to-End-Tests geschrieben werden oder UI-Verhalten geprüft wird:
- Nutze den `/playwright-cli` Skill für Browser-Automation

## Security — Immer prüfen

Bei jeder Code-Änderung automatisch:
- Keine Secrets im Code (Env-Vars nutzen)
- Keine `any` in TypeScript (außer mit dokumentiertem Grund)
- Input-Validation mit Zod an allen Boundaries
- Auth-Checks in allen API-Routes
- Tenant-Isolation bei Multi-Tenant-Apps
