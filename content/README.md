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
  "version": 4,
  "subjectId": "economical-framework",
  "lang": "de",
  "position": "first",
  "status": "published",
  "title": "…",
  "summary": "…",
  "blocks": [
    { "type": "text", "tab": "overview", "text": "**fett**, *kursiv* …" },
    { "type": "definition", "tab": "terms", "term": "Konsumentenrente", "termEn": "consumer surplus (CS)", "text": "…", "textEn": "…" },
    { "type": "formula", "tab": "formulas", "title": "…", "text": "CS = ½ · (P_max − P∗) · Q∗", "variables": [{ "symbol": "CS", "meaning": "…" }], "explanation": "…", "example": "…", "analogy": "…" },
    { "type": "image", "tab": "theory", "file": "img/market-equilibrium.svg", "caption": "…", "alt": "…" },
    { "type": "supplyDemand", "tab": "interactive", "a": 100, "b": 2, "c": -20, "d": 4 }
  ]
}
```

- `id` – stabile Kapitel-ID (6–40 Zeichen: `a–z`, `0–9`, `_`, `-`), zugleich die URL `/kapitel/<id>`.
- `version` – ganze Zahl ≥ 1 (Standard 1); hochzählen, um ein importiertes Kapitel zu aktualisieren.
- `subjectId` – das Fach (IDs siehe `server/schema.js`, z. B. `economical-framework`).
- `lang` – Sprache des Inhalts: `"de"` (Standard) oder `"en"`. Die Beschriftungen in den
  Bausteinen folgen ihr („Check answer“ statt „Antwort prüfen“).
- `position` – `"first"` stellt das Kapitel an den Anfang des Fachs; alternativ `after` mit der
  ID eines Kapitels, hinter dem es eingereiht wird. Sonst kommt es ans Ende.
- `status` – `"published"` (Standard) oder `"draft"`.
- `blocks` – Bausteine wie in [docs/bausteine.md](../docs/bausteine.md). Bilder und Dateien
  verweisen mit `file` auf eine Datei im Paket (`image`: `file`, `files`: `items[].file`).
  `tab` legt den Abschnitt fest (`overview`, `terms`, `formulas`, `theory`, `interactive`,
  `practice`); ohne `tab` gilt der Standard nach Typ.

Ein Paket mit unbekanntem Fach wird übersprungen (mit Hinweis in der Konsole) und
beim nächsten Start erneut versucht. `CONTENT_DIR=off` schaltet den Import ab.

## Abbildungen

Die Grafiken der Economical-Framework-Kapitel erzeugt `economical-framework/figures.mjs`
(es schreibt in die `img/`-Ordner beider Kapitel). Beschriftungen sind deutsch mit dem
englischen Begriff in Klammern; Farben und Flächenbuchstaben entsprechen den Demos:

```bash
node content/economical-framework/figures.mjs
```

Damit eine geänderte Abbildung ankommt, `version` in `chapter.json` hochzählen.
Importierte Dateien tragen einen Hash ihres Inhalts im Namen – eine geänderte
Grafik bekommt so eine neue Adresse und der Browser zeigt nicht die alte aus dem Cache.
