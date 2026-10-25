# Bausteine

Ein Kapitel ist eine Liste von Bausteinen. Im Editor (Kapitel → **Bearbeiten**)
hat jeder Baustein eine schmale Leiste: **Griff** zum Verschieben, Typ, **+**
(Baustein darunter einfügen) und **⋯** (nach oben/unten, duplizieren, umwandeln,
löschen). „Baustein hinzufügen“ am Ende öffnet die Auswahl; ein einzelnes **/**
in einem leeren Textbaustein öffnet sie ebenfalls und ersetzt den Baustein.

Leere Bausteine sieht nur der Admin – Betrachter bekommen sie nicht angezeigt.
Jeder Baustein kann zusätzlich `tab` tragen – den Abschnitt, in dem er erscheint (siehe unten).

## Abschnitte (Reiter)

Jeder Baustein gehört zu einem **Abschnitt** (`tab`): Übersicht (`overview`), Folien
(`slides`), Begriffe (`terms`), Formeln (`formulas`), Theorie (`theory`), Interaktiv
(`interactive`) oder Übungen (`practice`). Hat ein Kapitel Inhalt in mindestens **zwei** Abschnitten, lesen
Betrachter es Reiter für Reiter:

- oben eine **Reiterleiste** mit Anzahl (bleibt beim Scrollen sichtbar, scrollt auf dem Handy seitwärts),
- als erster Reiter die **Übersicht**: Einleitung, danach eine Karte pro Abschnitt mit
  Vorschau (Begriffe, Formelnamen, Überschriften) und „Los geht’s“, dann die übrigen Übersichts-Bausteine,
- ein **Inhaltsverzeichnis** – ab 1320 px Breite als Spalte rechts, darunter hinter dem
  Knopf „Inhalt“ als Blatt. Es listet pro Abschnitt Überschriften, Begriffe, Formeln, Demos und
  Quiz-/Kartenblöcke; ein Klick springt hin,
- am Ende jedes Reiters „Zurück / Weiter“, beim letzten Reiter „Als gelernt markieren“.

Der Reiter steht in der Adresse (`?tab=formulas`); Suchtreffer öffnen den passenden Reiter.

Ohne eigenen Abschnitt gilt ein Standard nach Typ: `slides` → Folien, `definition` → Begriffe, `formula` →
Formeln, Demos → Interaktiv, `quiz`/`flashcard` → Übungen, alles andere → Theorie.
Überschriften und Trennlinien gehören zum Abschnitt des **nächsten** Bausteins
(`src/lib/chapterTabs.js`, mit Unit-Tests).

Im **Editor** zeigt jeder Baustein seinen Abschnitt in der Leiste (Auswahlfeld; „Auto ·
Theorie“ = Standard). Die Reiterleiste filtert dort: „Alle“ oder ein Abschnitt – neue
Bausteine landen dann in diesem Abschnitt, Verschieben bleibt innerhalb der Anzeige.

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
| `definition` | Lernen | `term`, `text`, `termEn`, `textEn` | Begriff + Erklärung, farbig abgesetzt; optional der englische Begriff (Chip „EN“) und die Definition auf Englisch (für Klausuren auf Englisch) |
| `callout` | Lernen | `variant` (info/tip/important/warning), `title`, `text` | Hinweisbox: Info, Tipp, **Merke**, Achtung |
| `toggle` | Lernen | `title`, `text` | Aufklappbar, z. B. „Lösung anzeigen“ |
| `formula` | Lernen | `title`, `text`, `caption`, `variables[{ symbol, meaning }]`, `explanation`, `example`, `analogy` | Formel in Monospace; mit Name, Symbol-Legende („Was bedeutet was?“), „In einfachen Worten“, „Beispiel“ und „Vergleich aus dem Alltag“ – alles außer `text` optional |
| `slides` | Lernen | `title`, `slides[{ title, formula, text, example, image, alt }]` | Foliensatz: eine Idee pro Folie (Überschrift, Formel, Bild, Erklärung, Beispiel). Blättern mit Pfeilen, Punkten, Wischen oder ← → – und **Präsentieren** im Vollbild (auf dem iPhone füllt der Foliensatz das Fenster); Esc beendet |
| `flashcard` | Lernen | `front`, `back` | Karte zum Umdrehen; erscheint auch im Karteikarten-Training des Fachs |
| `quiz` | Lernen | `question`, `options[{ text, correct }]`, `explanation` | Multiple Choice mit „Antwort prüfen“ (mehrere Haken = Mehrfachauswahl) |
| `table` | Medien & Daten | `header` (bool), `rows[][]` | Tabelle, scrollt auf dem Handy in ihrer Box |
| `image` | Medien & Daten | `src`, `alt`, `caption` | Bild, antippen zum Vergrößern |
| `files` | Medien & Daten | `items[{ src, name, size, type }]` | Dateiliste (Folien, Skripte) zum Öffnen/Herunterladen |
| `links` | Medien & Daten | `items[{ url, title }]` | Linkliste (nur http/https/mailto) |
| `supplyDemand` | Interaktiv | `title`, `caption`, `a`, `b`, `c`, `d`, `control` (none/world/ceiling/floor), `controlPrice`, `worldPrice`, `tariff` | Markt-Demo: Q_D = a − b·P, Q_S = c + d·P. Szenarien (Verschiebungen, Marktöffnung mit Importen/Exporten, Importzoll, Höchst-/Mindestpreis), Flächen mit Buchstaben **A, B, C …** (Konsumentenrente, Produzentenrente, Zolleinnahmen, Wohlfahrtsverlust schraffiert), Ergebnistabelle „jetzt vs. Start“, Bedeutung der Flächen mit Gewinnern und Verlierern |
| `consumerChoice` | Interaktiv | `title`, `caption`, `m`, `p1`, `p2`, `alpha` | Demo Haushaltsoptimum: U = x₁^α · x₂^(1−α) und Budgetgerade mit Reglern; zeigt Optimum, Indifferenzkurven, GRT (MRT) = p₁/p₂ und GRS (MRS); „Eigenes Bündel A“ vergleicht GRS und GRT in einem frei gewählten Punkt |

**Interaktive Demos:** Die gespeicherten Zahlen sind der Startzustand – im Editor per
Zahlenfeld gesetzt. Lernende verändern sie mit Reglern; gespeichert wird dabei nichts,
„Zurücksetzen“ stellt den Start wieder her. Die Ausgangslage bleibt gestrichelt sichtbar,
damit Verschiebungen erkennbar sind; die Achsen richten sich nach dem Startzustand und
skalieren beim Verschieben nicht mit. Die Rechnungen stecken in `src/lib/demos.js` und
`src/lib/market.js` (Flächen A, B, C … wie in den Lehrbuch-Diagrammen; mit Unit-Tests),
die Texte der Markt-Demo in `src/lib/marketText.js`.

## Formeln schreiben

In Formel-Bausteinen und im Formelfeld einer Folie gilt eine kleine LaTeX-Schreibweise
(`src/lib/math.js`, gerendert ohne HTML von `components/MathText.jsx`). In jedem anderen
Textfeld steht eine Formel zwischen Dollarzeichen: `$a^2 + b^2$`. Der Editor zeigt unter
Formelfeldern eine Vorschau.

| Eingabe | Ergebnis |
| --- | --- |
| `x^2`, `x^10`, `a^{x+y}`, `e^(−rt)` | Hochzahl (eine Ziffernfolge oder ein Buchstabe, sonst Klammern) |
| `a_i`, `x_{n+1}`, `P_max` | Index (ein Wort, sonst Klammern) |
| `\sum_{i=1}^{n} a_i`, `\prod_{t=1}^{n}` | Σ / Π mit Grenzen darunter und darüber |
| `\frac{a}{b}` | Bruch |
| `\sqrt{x}`, `\sqrt[3]{x}` | Wurzel |
| `\bar{x}` | Mittelwert (Strich darüber) |
| `\cdot \neq \leq \geq \pm \approx \infty \Rightarrow \dots` | · ≠ ≤ ≥ ± ≈ ∞ ⇒ … |
| `\{ \} \_ \^ \$ \%` | die Zeichen selbst |

Leerzeichen und Zeilenumbrüche bleiben, wie getippt. Ein Dollarzeichen mit Leerzeichen
dahinter („5 $ und 10 $“) bleibt normaler Text.

## Formatierung in Textfeldern

| Eingabe | Ergebnis |
| --- | --- |
| `**fett**` | **fett** |
| `*kursiv*` oder `_kursiv_` | *kursiv* |
| `==markiert==` | hervorgehoben (gelb) |
| `` `Code` `` | Monospace |
| `$a^2$` | Formel (siehe oben) |
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
