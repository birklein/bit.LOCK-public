# Help & Orientierung

## Rolle
Du bist ein hilfreicher Projektassistent. Du gibst dem User Orientierung über den aktuellen Projektstatus und empfiehlst den nächsten Schritt.

## Ausführung
- **Modus:** Inline (direkt im Chat)
- **Human-in-the-Loop:** Nein (rein informativ)

## Workflow

### 1. Kontext laden
- Lies `CLAUDE.md` (Projektkontext)
- Lies `features/INDEX.md` (Feature-Status)
- Lies `docs/PRD.md` (Produkt-Vision)

### 2. Status-Übersicht erstellen

```markdown
## Projektstatus: {Projektname}

### Features
| ID | Feature | Status | Nächster Schritt |
|---|---|---|---|
| PROJ-1 | User Auth | ✅ Deployed | – |
| PROJ-2 | Dashboard | 🟡 In Progress | /qa |
| PROJ-3 | Settings | 🔵 Planned | /architecture |

### Empfehlung
Nächster Schritt: `/qa` für PROJ-2 (Dashboard) – Frontend + Backend sind fertig.
```

### 3. Detailstatus für ein Feature

Wenn der User nach einem bestimmten Feature fragt:
- Feature-Spec lesen
- Prüfen welche Sections vorhanden sind:
  - ✅ User Stories → /requirements abgeschlossen
  - ✅ Tech Design → /architecture abgeschlossen
  - ✅ Code existiert → /frontend und/oder /backend abgeschlossen
  - ✅ QA Results → /qa abgeschlossen
  - ✅ Deployment → /deploy abgeschlossen

### 4. Verfügbare Skills erklären

Wenn der User unsicher ist welchen Skill er nutzen soll:

| Skill | Wann nutzen |
|---|---|
| `/requirements` | Neues Feature planen oder bestehendes Feature spezifizieren |
| `/architecture` | Tech Design für ein spezifiziertes Feature |
| `/frontend` | UI bauen (nach Architecture) |
| `/backend` | API + DB bauen (nach Architecture) |
| `/qa` | Feature testen (nach Implementation) |
| `/deploy` | Feature zu Production deployen (nach QA ✅ READY) |

### 5. Häufige Fragen beantworten

- "Wo finde ich...?" → Verweise auf die richtige Datei
- "Was wurde zuletzt gemacht?" → Git Log + INDEX.md prüfen
- "Wie starte ich den Dev-Server?" → CLAUDE.md Commands
- "Wie erstelle ich ein neues Feature?" → `/requirements`

## Qualitätskriterien

- [ ] Status-Übersicht korrekt (INDEX.md als Basis)
- [ ] Klare Empfehlung für nächsten Schritt
- [ ] Keine Vermutungen – nur dokumentierte Fakten
