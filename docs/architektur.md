# Architektur

## Überblick

```
Browser (React SPA)  ──fetch, Cookie + X-Requested-With──▶  Express (server/)
  src/pages, components                                     ├─ auth.js     Login, Rollen
  src/lib/api.js  (ein Wrapper für alle Aufrufe)            ├─ routes/     REST-API
                                                            ├─ db.js       data/db.json (im Speicher, atomar gespeichert)
                                                            └─ /data/…     hochgeladene Dateien (nur angemeldet)
```

- **Entwicklung:** Vite (4200) liefert das Frontend und leitet `/api` und `/data`
  an Express (4300) weiter – eine Origin, Cookies funktionieren wie in Produktion.
- **Produktion:** ein Prozess auf 4300 liefert API, `/data` und `dist/` aus.

## Datenmodell (`data/db.json`)

```js
{
  schemaVersion: 1,
  semesters: [{ id, number, title, description, createdAt, updatedAt }],
  subjects:  [{ id, semesterId, title, short, description, icon, color, ects, order, … }],
  chapters:  [{ id, subjectId, title, summary, status: 'draft'|'published', lang: 'de'|'en', blocks: [...], order, rev, … }],
  trash:     [{ id, kind: 'chapter', item: <Kapitel>, subjectTitle, deletedAt }],
  contentImported: [{ id, version, rev, at }],   // übernommene Inhaltspakete (Version, Revision danach)
}
```

- **Semester → Fach → Kapitel → Bausteine.** Ein Baustein ist `{ id, type, …felder }`
  (alle Typen: [bausteine.md](bausteine.md)).
- **Normalizer pro Sammlung** (`server/schema/*.js`): Jede Eingabe – aus einer
  Anfrage oder aus der Datei – wird auf Typ, Länge und erlaubte Werte gebracht.
  Unbekannte Baustein-Typen, `javascript:`-Links und Dateiverweise außerhalb des
  Kapitelordners werden verworfen.
- **Schema-Änderungen nur additiv:** Ein neues Feld bekommt im Normalizer einen
  Default; alte Datensätze bleiben ohne Migration gültig.
- **Erststart:** Gibt es noch keine Datenbank, legt `seedDB()` das 1. Semester mit
  seinen fünf Fächern an. Über eine bestehende Datenbank läuft das nie.
- **Dateien** eines Kapitels liegen in `data/chapters/<kapitelId>/<zufall>-<name>`.
- **Inhaltspakete** (`server/content.js`): Kapitel aus `content/<fach>/<kapitel>/chapter.json`
  werden beim Start einmal übernommen, ihre Abbildungen nach `data/chapters/<id>/` kopiert.
  Eine höhere `version` aktualisiert das Kapitel – nur wenn es seit dem Import nicht
  bearbeitet wurde (gleiche `rev`), sonst kommt sie als Entwurf daneben; gelöschte
  Kapitel bleiben gelöscht. Details: [content/README.md](../content/README.md).

### Speichern

- `mutateDB(fn)` – Lesen → Ändern → Schreiben, seriell in einer Warteschlange.
  Wirft `fn` (z. B. 404), wird nichts geschrieben.
- **Atomar:** Temp-Datei → `fsync` → `rename`. Ein Absturz mitten im Speichern
  lässt die alte Datei heil.
- **Backups:** `db.json.bak` (letzte gute Version) und bis zu 10 Snapshots in
  `data/backups/` (höchstens alle 3 Minuten).
- **Selbstheilung:** Ist `db.json` defekt, greift `.bak`, dann der neueste Snapshot.
  Ist gar nichts lesbar, startet der Server nicht (statt eine leere Datenbank über
  die echte zu schreiben).

### Gleichzeitiges Bearbeiten

Jedes Kapitel hat eine Revision `rev`. Der Editor schickt bei jedem Speichern die
Revision mit, auf der seine Änderung beruht (`baseRev`). Hat inzwischen ein
anderer Tab/ein anderes Gerät gespeichert, antwortet der Server mit **409** und
die Seite bietet „Neu laden“ an – nichts wird still überschrieben.

## Login und Rollen (`server/auth.js`)

- Zwei feste Konten, keine Benutzertabelle: `User` (Rolle `viewer`) und `Admin`
  (Rolle `admin`). Passwörter aus `USER_PASSWORD` / `ADMIN_PASSWORD`.
- Passwortvergleich in konstanter Zeit (SHA-256 + `timingSafeEqual`).
- **Session = signiertes Cookie** `ba_session` (`HttpOnly`, `SameSite=Lax`,
  `Secure` bei HTTPS): `v1.<payload>.<HMAC-SHA256>`. Der Schlüssel wird aus
  `SESSION_SECRET` **und** beiden Passwörtern abgeleitet – ein neues Passwort
  meldet alle ab. Kein Session-Speicher auf dem Server nötig.
- **Bremse:** 10 Fehlversuche pro IP in 15 Minuten → 429.
- Jede `/api/*`-Route außer `/api/health` und `/api/auth/*` verlangt eine Session;
  schreibende Routen zusätzlich die Admin-Rolle (`requireAdmin`).
- Betrachter sehen nur **veröffentlichte** Kapitel – auch in Suche, Karteikarten,
  „Zuletzt aktualisiert“ und bei den Dateien unter `/data`.

## Weitere Schutzmaßnahmen (`server/http.js`)

| Maßnahme | Wogegen |
| --- | --- |
| CSRF-Header `X-Requested-With` bei jeder schreibenden Anfrage (+ `SameSite`-Cookie) | fremde Seiten, die im Namen eines angemeldeten Nutzers posten |
| Host-Allowlist (IP, `localhost`, LAN-/Tailscale-Namen, `ALLOWED_HOSTS`) | DNS-Rebinding |
| Content-Security-Policy (nur `'self'`), `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy` | XSS-Folgen, Clickjacking |
| `/data` nur für Entitätsordner, Pfade normalisiert, `sandbox` für SVG/HTML, Download statt Anzeige für unbekannte Typen | Path-Traversal, Skripte in Uploads |
| Fehler immer als JSON ohne Stacktrace | Informationslecks |
| Bausteine werden als React-Elemente gerendert, nie als HTML | XSS über Inhalte |

## Frontend

- **Shell** (`App.jsx`): `AuthProvider` → Login-Schranke → `CatalogProvider`
  (Semester + Fächer für Sidebar und Seiten) → Sidebar/Drawer, Top-Bar, Routen.
- Alle Seiten außer Login und Übersicht werden **lazy** geladen (eigenes JS-Paket).
- **Routen:** `/`, `/semester/:id`, `/fach/:id`, `/fach/:id/karteikarten`,
  `/kapitel/:id` (`?bearbeiten=1` = Editor, `?tab=formulas` = Abschnitt), `/papierkorb`.
- **`lib/chapterTabs.js`:** teilt die Bausteine eines Kapitels in Abschnitte
  (Übersicht, Begriffe, Formeln, Theorie, Interaktiv, Übungen) und liefert die
  Einträge für Inhaltsverzeichnis und Übersichtskarten; die Oberfläche dazu steckt in
  `components/chapter/ChapterSections.jsx`. Die Top-Bar setzt `data-mbar="hidden"`
  am `<html>`, solange sie weggescrollt ist – die klebende Reiterleiste rückt dann nach oben.
- **`lib/autosave.js`:** entprellt speichern, aber nie verlieren – ausstehende
  Speicherungen laufen beim Verlassen der Seite, bei verstecktem Tab und beim
  Schließen (als `keepalive`-Request); der Browser fragt nach, wenn noch etwas
  ungespeichert ist.
- **`lib/inline.js`:** kleines Markdown (fett, kursiv, markiert, Code, Links, Listen)
  als Token → `components/Inline.jsx` rendert React-Elemente.
- **Lernfortschritt** (gelernt, gewusste Karten, zuletzt geöffnet) liegt im
  `localStorage` des Geräts – alle Betrachter teilen sich das Konto `User`.

## Abweichungen von der Blaupause

| Blaupause | Hier | Warum |
| --- | --- | --- |
| Kein Login, nur Loopback | Login mit zwei Rollen, Session-Cookie | ausdrücklich gewünscht; erlaubt auch Hosting hinter HTTPS |
| React Router 6, Vite 5 | React Router 7 (deklarativ, gleiche API), Vite 6 | bekannte Sicherheitslücken in den älteren Versionen (`npm audit` = 0) |
| Node ≥ 18.18 | Node ≥ 20.12 | `process.loadEnvFile` für die `.env` ohne Zusatzpaket |
| SSE-Live-Updates | einfache Revisionsprüfung (409) | ein Redakteur – MVP |
| UI auf Englisch | UI auf Deutsch | deutschsprachiger Studiengang |
| CSS desktop-first (`max-width`) | CSS mobile first (`min-width`), gleiche Breakpoints | ausdrücklich gewünscht |
| Design-Tool-Funktionen (Moodboards, Präsentationen …) | weggelassen | nicht Teil dieser App |
