# Styles

Reines CSS mit Custom Properties – kein Tailwind, kein CSS-in-JS.

## Dateien

| Datei | Inhalt | Geladen von |
| --- | --- | --- |
| `base.css` | Tokens, Rahmen (Sidebar/Drawer, Top-Bar), Buttons, Formulare, Dialoge, Menüs, Toasts, Suche, leere Zustände, Cookie-Hinweis (`cookie-`) | `main.jsx` (immer) |
| `login.css` | Login-Seite (`login-`) | `LoginPage.jsx` |
| `legal.css` | Impressum und Datenschutzerklärung (`legal-`) | `LegalPage.jsx` |
| `catalog.css` | Übersicht, Semester, Fach, Papierkorb (`subj-`, `subject-`, `chapter-`, `continue-`) | die jeweiligen Seiten |
| `chapter.css` | Kapitelseite: Pfad, Admin-Leiste, Titel, Fußnavigation, Abschnitte (`ch-`: Reiter, Inhaltsverzeichnis, Übersichtskarten) | `ChapterDetail.jsx` |
| `blocks.css` | Bausteine im Lesemodus (`blk-`), Demos (`demo-`, Markt-Demo `mk-`) und im Editor (`ed-`, `picker-`) | `ChapterDetail.jsx`, `FlashcardsPage.jsx` |
| `study.css` | Karteikarten-Training (`study-`) | `FlashcardsPage.jsx` |

Bereichsdateien werden nur geladen, wenn eine Seite des Bereichs geöffnet wird, und
kommen nach `base.css` (gewinnen also bei gleicher Spezifität).

## Regeln

- **Mobile first:** Die Grundregeln gelten fürs Handy. Breitere Bildschirme ergänzen per
  `min-width`-Query. Nur diese Breakpoints:
  - `min-width: 641px` – Tablet: Dialoge zentriert statt Bottom-Sheet
  - `min-width: 900px` – Desktop: Sidebar angedockt statt Drawer, keine Top-Bar (`DESKTOP` in `lib/useMedia.js`)
  - `min-width: 1100px` / `1440px` – mehr Spalten im Raster
  - `(hover: hover) and (pointer: fine)` – Maus: Editor-Leisten dezent bis Hover
  - `prefers-reduced-motion: reduce` – Animationen aus
- **Farben nur über Tokens** (`--surface`, `--accent` …), nie als Hex im Bereichs-CSS.
  Tönungen über die RGB-Tokens: `rgba(var(--ok-rgb), .15)`.
- **Fachfarbe:** Elemente innerhalb eines Fachs nutzen `--tint` / `--tint-rgb`
  (gesetzt per `subjectStyle()` aus `lib/subjects.js`).
- Text auf der Akzentfarbe ist dunkel (`--on-accent`), nicht weiß.
- **Touch:** Tap-Flächen ≥ 44 px, Eingaben 16 px Schrift (kein iOS-Zoom), Safe-Areas per
  `env(safe-area-inset-*)`, `100dvh` statt `100vh`, kein seitliches Scrollen.
- Klassen tragen ein Bereichs-Präfix; allgemeine Bausteine (`btn`, `chip`, `modal`, `menu`,
  `empty`, `input`) haben keins.
