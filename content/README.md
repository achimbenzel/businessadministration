# Inhaltspakete

Kapitel, die mit dem Code ausgeliefert werden. Beim Serverstart wird jedes noch
nicht importierte Paket **einmal** in die Datenbank übernommen (Dateien nach
`data/chapters/<id>/`). Danach gehört das Kapitel der Redaktion wie jedes andere –
es lässt sich in der App bearbeiten, verschieben oder löschen und wird nie ein
zweites Mal importiert (`contentImported` in `data/db.json` merkt sich das).

```
content/
└── <fach>/
    └── <nr>-<kapitel>/
        ├── chapter.json   Kapitel mit Bausteinen
        ├── img/…          Abbildungen
        └── figures.mjs    (optional) erzeugt die Abbildungen
```

## `chapter.json`

```json
{
  "id": "efed-01-supply-demand-indifferenz",
  "subjectId": "economical-framework",
  "position": "first",
  "status": "published",
  "title": "…",
  "summary": "…",
  "blocks": [
    { "type": "text", "text": "**fett**, *kursiv* …" },
    { "type": "image", "file": "img/marktgleichgewicht.svg", "caption": "…", "alt": "…" }
  ]
}
```

- `id` – stabile Kapitel-ID (6–40 Zeichen: `a–z`, `0–9`, `_`, `-`), zugleich die URL `/kapitel/<id>`.
- `subjectId` – das Fach (IDs siehe `server/schema.js`, z. B. `economical-framework`).
- `position` – `"first"` stellt das Kapitel an den Anfang des Fachs, sonst kommt es ans Ende.
- `status` – `"published"` (Standard) oder `"draft"`.
- `blocks` – Bausteine wie in [docs/bausteine.md](../docs/bausteine.md). Bilder und Dateien
  verweisen mit `file` auf eine Datei im Paket (`image`: `file`, `files`: `items[].file`).

Ein Paket mit unbekanntem Fach wird übersprungen (mit Hinweis in der Konsole) und
beim nächsten Start erneut versucht. `CONTENT_DIR=off` schaltet den Import ab.

## Abbildungen

Die Grafiken in `economical-framework/01-…/img/` erzeugt `figures.mjs`:

```bash
node content/economical-framework/01-supply-demand-indifferenzkurven/figures.mjs
```

Achtung: Ein bereits importiertes Kapitel ändert sich dadurch nicht mehr –
dann die Abbildung in der App im Bild-Baustein ersetzen.
