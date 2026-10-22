# Inhaltspakete

Kapitel, die mit dem Code ausgeliefert werden. Beim Serverstart wird jedes neue
Paket **einmal** in die Datenbank übernommen (Dateien nach `data/chapters/<id>/`).
Danach gehört das Kapitel der Redaktion wie jedes andere – es lässt sich in der App
bearbeiten, verschieben oder löschen (`contentImported` in `data/db.json` merkt sich,
welche Version importiert wurde).

## Aktualisieren

Ein Paket aktualisieren = Inhalt ändern **und `version` hochzählen**. Beim nächsten Start:

| Zustand des Kapitels in der App | Was passiert |
| --- | --- |
| seit dem Import nicht bearbeitet (Sortieren zählt nicht) | wird durch die neue Version ersetzt; Fach und Position bleiben |
| in der App bearbeitet | bleibt unverändert – die neue Version kommt als **Entwurf** `<id>-v<version>` direkt dahinter |
| gelöscht | bleibt gelöscht |

Ohne höhere `version` wird ein geändertes Paket nicht erneut eingelesen.

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
  "version": 2,
  "subjectId": "economical-framework",
  "lang": "en",
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
- `version` – ganze Zahl ≥ 1 (Standard 1); hochzählen, um ein importiertes Kapitel zu aktualisieren.
- `subjectId` – das Fach (IDs siehe `server/schema.js`, z. B. `economical-framework`).
- `lang` – Sprache des Inhalts: `"de"` (Standard) oder `"en"`. Die Beschriftungen in den
  Bausteinen folgen ihr („Check answer“ statt „Antwort prüfen“).
- `position` – `"first"` stellt das Kapitel an den Anfang des Fachs, sonst kommt es ans Ende.
- `status` – `"published"` (Standard) oder `"draft"`.
- `blocks` – Bausteine wie in [docs/bausteine.md](../docs/bausteine.md). Bilder und Dateien
  verweisen mit `file` auf eine Datei im Paket (`image`: `file`, `files`: `items[].file`).

Ein Paket mit unbekanntem Fach wird übersprungen (mit Hinweis in der Konsole) und
beim nächsten Start erneut versucht. `CONTENT_DIR=off` schaltet den Import ab.

## Abbildungen

Die Grafiken in `economical-framework/01-…/img/` erzeugt `figures.mjs`:

```bash
node content/economical-framework/01-supply-demand-indifference-curves/figures.mjs
```

Damit eine geänderte Abbildung ankommt, `version` in `chapter.json` hochzählen.
Importierte Dateien tragen einen Hash ihres Inhalts im Namen – eine geänderte
Grafik bekommt so eine neue Adresse und der Browser zeigt nicht die alte aus dem Cache.
