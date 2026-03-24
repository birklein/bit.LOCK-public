---
description: Design-Qualitätsstandards für UI-Komponenten — automatisch bei Frontend-Dateien
globs: "**/*.{tsx,jsx,css}"
---

# Design-Qualität — Premium-UI-Standards

Diese Regeln gelten automatisch bei jeder UI-Änderung.

## Visueller Anspruch

- **Kein generischer AI-Look** — keine Standard-Grautöne, keine langweiligen Card-Layouts
- Jede UI muss sich anfühlen wie von einem erfahrenen Designer erstellt
- Whitespace bewusst einsetzen — nicht alles vollstopfen
- Typografie-Hierarchie: klare Unterscheidung von Titeln, Subtiteln, Body, Captions
- Konsistente Abstände: 4px-Grid (p-1, p-2, p-4, p-6, p-8, p-12)

## Tailwind v4 Standards

- **Utility-First** — kein Custom-CSS außer für Animationen
- Responsive: `sm:` → `md:` → `lg:` → `xl:` (Mobile-First)
- Dark-Mode: `dark:` Varianten für alle Farben wenn im Projekt aktiviert
- **Context7 nutzen** für aktuelle Tailwind v4 Klassen und Patterns

## Komponenten-Qualität

- Alle 4 States implementieren: Loading, Error, Empty, Success
- Smooth Transitions: `transition-all duration-200` für Hover/Focus
- Fokus-Ringe: `focus-visible:ring-2 focus-visible:ring-offset-2`
- Hover-States: subtil aber spürbar (`hover:bg-opacity-90` statt harter Farbwechsel)
- Animationen: sparsam, purposeful, `prefers-reduced-motion` respektieren

## Figma-Integration

Falls eine Figma-URL in der Feature-Spec vorhanden:
- Automatisch `get_design_context` aufrufen
- Design-Tokens übernehmen (Farben, Abstände, Radien)
- Pixel-Perfect ist das Ziel — Abweichungen dokumentieren

## Barrierefreiheit (automatisch)

- Semantisches HTML: `<button>` statt `<div onClick>`
- ARIA-Labels für Icon-Buttons: `aria-label="Schließen"`
- Kontrast: mind. 4.5:1 für normalen Text
- Tab-Reihenfolge: logisch, keine `tabIndex` > 0
- Screen-Reader: Wichtige UI-Elemente angekündigt

## Deutsche UI-Texte

- Alle Texte auf Deutsch mit korrekten Umlauten (ä, ö, ü, ß)
- Konsistente Terminologie — gleiche Konzepte = gleiche Wörter
- Nutzerfreundliche Fehlermeldungen: "E-Mail-Adresse ist ungültig" statt "Validation Error"
