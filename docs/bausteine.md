# Bausteine

Ein Kapitel ist eine Liste von Bausteinen. Im Editor (Kapitel → **Bearbeiten**)
hat jeder Baustein eine schmale Leiste: **Griff** zum Verschieben, Typ, **+**
(Baustein darunter einfügen) und **⋯** (nach oben/unten, duplizieren, umwandeln,
löschen). „Baustein hinzufügen“ am Ende öffnet die Auswahl; ein einzelnes **/**
in einem leeren Textbaustein öffnet sie ebenfalls und ersetzt den Baustein.

Leere Bausteine sieht nur der Admin – Betrachter bekommen sie nicht angezeigt.

**Sprache:** Jedes Kapitel hat eine Inhaltssprache (Deutsch oder Englisch, im ⋯-Menü des
Kapitels umstellbar). Die Beschriftungen in den Bausteinen folgen ihr – „Quiz“, „Check
answer“, „Tap to flip“ in einem englischen Kapitel (`src/lib/blockText.js`). Navigation und
Editor bleiben deutsch.

## Alle Typen

| Typ | Gruppe | Felder | Anzeige für Betrachter |
| --- | --- | --- | --- |
| `text` | Grundlagen | `text` | Absätze mit Formatierung und Listen |
| `heading` | Grundlagen | `text`, `level` (2/3) | Zwischenüberschrift |
| `list` | Grundlagen | `style` (bullet/number), `items[]` | Aufzählung (ein Punkt pro Zeile im Editor) |
| `quote` | Grundlagen | `text`, `source` | Zitat mit Quelle |
| `divider` | Grundlagen | – | Trennlinie |
| `definition` | Lernen | `term`, `text` | Begriff + Erklärung, farbig abgesetzt |
| `callout` | Lernen | `variant` (info/tip/important/warning), `title`, `text` | Hinweisbox: Info, Tipp, **Merke**, Achtung |
| `toggle` | Lernen | `title`, `text` | Aufklappbar, z. B. „Lösung anzeigen“ |
| `formula` | Lernen | `text`, `caption` | Formel/Rechenweg in Monospace |
| `flashcard` | Lernen | `front`, `back` | Karte zum Umdrehen; erscheint auch im Karteikarten-Training des Fachs |
| `quiz` | Lernen | `question`, `options[{ text, correct }]`, `explanation` | Multiple Choice mit „Antwort prüfen“ (mehrere Haken = Mehrfachauswahl) |
| `table` | Medien & Daten | `header` (bool), `rows[][]` | Tabelle, scrollt auf dem Handy in ihrer Box |
| `image` | Medien & Daten | `src`, `alt`, `caption` | Bild, antippen zum Vergrößern |
| `files` | Medien & Daten | `items[{ src, name, size, type }]` | Dateiliste (Folien, Skripte) zum Öffnen/Herunterladen |
| `links` | Medien & Daten | `items[{ url, title }]` | Linkliste (nur http/https/mailto) |
| `supplyDemand` | Interaktiv | `title`, `caption`, `a`, `b`, `c`, `d`, `control` (none/ceiling/floor), `controlPrice` | Demo Angebot & Nachfrage: Q_D = a − b·P, Q_S = c + d·P mit Reglern; zeigt Gleichgewicht, Konsumenten-/Produzentenrente, Höchst-/Mindestpreis mit Mangel bzw. Überschuss |
| `consumerChoice` | Interaktiv | `title`, `caption`, `m`, `p1`, `p2`, `alpha` | Demo Haushaltsoptimum: U = x₁^α · x₂^(1−α) und Budgetgerade mit Reglern; zeigt Optimum, Indifferenzkurven, GRS |

**Interaktive Demos:** Die gespeicherten Zahlen sind der Startzustand – im Editor per
Zahlenfeld gesetzt. Lernende verändern sie mit Reglern; gespeichert wird dabei nichts,
„Zurücksetzen“ stellt den Start wieder her. Die Ausgangslage bleibt gestrichelt sichtbar,
damit Verschiebungen erkennbar sind; die Achsen richten sich nach dem Startzustand und
skalieren beim Verschieben nicht mit. Die Rechnungen stecken in `src/lib/demos.js`
(mit Unit-Tests).

## Formatierung in Textfeldern

| Eingabe | Ergebnis |
| --- | --- |
| `**fett**` | **fett** |
| `*kursiv*` oder `_kursiv_` | *kursiv* |
| `==markiert==` | hervorgehoben (gelb) |
| `` `Code` `` | Monospace |
| `[Text](https://…)` | Link (nur http/https/mailto) |
| eine URL | wird automatisch verlinkt |
| Leerzeile | neuer Absatz |
| `- Punkt` / `• Punkt` | Aufzählung |
| `1. Punkt` | nummerierte Liste |

Text wird nie als HTML ausgegeben – eingegebenes HTML erscheint als Text.

## Neuen Baustein-Typ hinzufügen

1. **Server** – `server/schema/chapters.js`: im Objekt `BLOCKS` einen Normalizer
   für die Felder ergänzen (Längen begrenzen, Defaults setzen) und in
   `blockText()` den durchsuchbaren Text liefern. Ohne diesen Schritt verwirft
   der Server den Typ.
2. **Metadaten** – `src/lib/blocks.js`: Eintrag in `BLOCK_META` (Name, lucide-Icon,
   Hinweis, `create()` mit Startwerten), in eine Gruppe von `BLOCK_GROUPS`
   aufnehmen und `isEmptyBlock()` ergänzen.
3. **Komponenten** – `View` (Lesemodus) und `Edit` (Editor) schreiben, z. B. in
   `src/components/blocks/LearnBlocks.jsx`. `Edit` bekommt
   `{ block, onChange(patch), upload(file), autoFocus, chapterId }`.
4. **Registrieren** – `src/components/blocks/registry.js`. Beschriftungen in `View`
   über `useBlockText()` aus `src/lib/blockText.js` (Deutsch und Englisch ergänzen).
5. **Styles** – `src/styles/blocks.css` (`blk-…` für die Ansicht, `ed-…` für den Editor).
6. **Test** – in `tests/chapters.test.js` prüfen, dass der Normalizer die Felder
   übernimmt und Ungültiges verwirft.
