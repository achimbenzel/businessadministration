# BA Lernplattform · Hochschule Mainz

Eine Web-App zum Lernen der Inhalte des Masterstudiengangs
**Business Administration (M.Sc.)** der Hochschule Mainz – gegliedert nach
**Semester → Fach → Kapitel**. Die Inhalte werden direkt in der App gepflegt,
wie in einem CMS: Kapitel bestehen aus **Bausteinen** (ähnlich wie in Notion) –
Text, Definitionen, Hinweise, Formeln, Tabellen, Karteikarten, Quizfragen,
Bilder, Dateien, Links und interaktive Demos.

Dark Mode, mobile first, Icons von [lucide](https://lucide.dev), Schrift
DM Sans lokal gebündelt (kein CDN). Aufbau nach der Projekt-Blaupause des
„Confinium Dashboard“ (React + Vite, Express, JSON-Datenbank, `node:test`,
Playwright).

## Funktionen (MVP)

- **Login** – ohne Passwort kein Zugriff. Zwei Konten:
  - `User` – **Betrachter**: liest alle veröffentlichten Kapitel, übt Karteikarten, löst Quizfragen.
  - `Admin` – **Redaktion**: legt Semester, Fächer und Kapitel an und bearbeitet sie.
  - Die Passwörter stehen in der `.env` (siehe unten).
- **Semester & Fächer** – angelegt ist das 1. Semester mit:
  - Personalmanagement & Organisation
  - Economical Framework for Entrepreneurial Decisions
  - Grundlagen der BWL (mit Accounting und Planspiel)
  - Rechtliche Rahmenbedingungen unternehmerischer Entscheidungen
  - Kosten- & Leistungsrechnung
- **Kapitel-Editor (Admin)** – Bausteine hinzufügen (Menü oder „/“ in einem leeren
  Textbaustein), per Ziehen sortieren, duplizieren, umwandeln, löschen mit
  „Rückgängig“. Speichert automatisch beim Tippen. Kapitel sind zuerst
  **Entwurf** und werden mit einem Klick **veröffentlicht**.
- **Lernen** – Karteikarten pro Fach üben (umdrehen, „Gewusst“/„Nochmal“, Wischen),
  Quizfragen mit Auflösung, Kapitel als „gelernt“ markieren, Fortschritt pro
  Fach, „Weiterlernen“ auf der Startseite. Der Fortschritt wird pro Gerät gespeichert.
- **Suche** (Strg/⌘ + K) über Fächer, Kapitel und den Text aller Bausteine.
- **Papierkorb** – gelöschte Kapitel bleiben 30 Tage wiederherstellbar.
- **Inhaltspakete** – Kapitel können auch im Repo unter `content/` vorbereitet werden
  und werden beim Serverstart einmal übernommen (siehe [content/README.md](content/README.md)).
  Im Fach Economical Framework: *Angebot & Nachfrage (Supply & Demand)* und *Budgetgerade &
  Indifferenzkurven (Consumer Choice)* – auf Deutsch mit englischen Fachbegriffen und Definitionen
  (die Klausur ist englisch).
- **Interaktive Demos** als Bausteine – Markt-Demo mit Szenarien (Verschiebungen, Weltmarkt, Zoll,
  Höchst-/Mindestpreis) und Flächen A, B, C … mit Gewinnern und Verlierern; Haushaltsoptimum mit
  Budgetgerade, Indifferenzkurven und GRS-vs.-GRT-Vergleich in einem eigenen Bündel.
- **Inhaltssprache pro Kapitel** (Deutsch/Englisch) – die Beschriftungen in den Bausteinen folgen ihr.
- **Abschnitte** – Kapitel mit Inhalt in mehreren Bereichen werden in Reitern gelesen:
  Übersicht · Begriffe · Formeln · Theorie · Interaktiv · Übungen, mit Übersichtskarten,
  Inhaltsverzeichnis (Spalte am Desktop, Blatt am Handy) und „Weiter“ am Ende jedes Reiters.
- **Formeln zum Verstehen** – Formel-Bausteine mit Symbol-Legende, Erklärung in einfachen
  Worten, Rechenbeispiel und Alltagsvergleich; Definitionen optional mit englischem Begriff.
- **Als App installierbar** (PWA-Manifest, Icons, iOS-Meta-Tags).

## Schnellstart

Voraussetzung: **Node.js ≥ 20.12** (empfohlen 22, siehe `.nvmrc`).

```bash
npm install
cp .env.example .env      # dann USER_PASSWORD und ADMIN_PASSWORD eintragen
npm run dev               # http://127.0.0.1:4200
```

`npm run dev` startet den Vite-Dev-Server (4200) und die API (4300) zusammen.
Ohne gesetzte Passwörter startet der Server nicht und sagt, was fehlt.

### Die `.env`

| Variable | Bedeutung |
| --- | --- |
| `USER_PASSWORD` | Passwort für den Betrachter (Benutzername `User`) |
| `ADMIN_PASSWORD` | Passwort für den Admin (Benutzername `Admin`) |
| `SESSION_SECRET` | Schlüssel zum Signieren der Login-Cookies. Leer = Abmeldung bei jedem Neustart |
| `SESSION_DAYS` | Gültigkeit eines Logins in Tagen (Standard 30) |
| `HOST`, `API_PORT` | Adresse/Port des Servers (Standard `127.0.0.1:4300`) |
| `ALLOWED_HOSTS` | eigene Domain(s) für den Betrieb auf einem Server |
| `COOKIE_SECURE` | `auto` (Standard), `true` oder `false` |
| `MAX_UPLOAD_MB` | maximale Dateigröße pro Upload (Standard 50) |

Ein Passwort in der `.env` ändern meldet alle Geräte ab. Die `.env` ist in
`.gitignore` und wird nie committet; Vite gibt nur `VITE_*`-Variablen an den
Browser weiter, die Passwörter bleiben also auf dem Server.

## Produktion

```bash
npm run build
npm start                 # ein Prozess: API + gebautes Frontend auf 127.0.0.1:4300
```

Für den Betrieb auf einem Server (HTTPS per Reverse-Proxy, Domain, Backups)
siehe [docs/betrieb.md](docs/betrieb.md).

## Scripts

| Befehl | Was es tut |
| --- | --- |
| `npm run dev` | Dev-Server + API mit Auto-Reload |
| `npm run build` | Frontend nach `dist/` bauen |
| `npm start` | Produktion: API + `dist/` |
| `npm run lint` | ESLint |
| `npm test` | API- und Unit-Tests (`node:test`) |
| `npm run test:e2e` | Browser-Tests mit Playwright gegen den Build (vorher `npm run build`) |
| `npm run check` | lint + test + build |
| `npm run licenses` | Lizenzen aller installierten Pakete prüfen |
| `npm run icons` | PWA-Icons aus `public/icons/icon.svg` neu erzeugen |

## Projektstruktur

```
├── index.html              Einstieg (viewport-fit=cover, Manifest, Apple-Meta-Tags)
├── vite.config.js          Dev-Server 4200, Proxy /api + /data → 4300
├── .env.example            Vorlage für die .env (Passwörter)
├── public/                 manifest.webmanifest, icons/
├── data/                   ⚠️ gitignored – Datenbank und hochgeladene Dateien
├── server/
│   ├── index.js            Start: .env laden, Passwörter prüfen, DB laden, listen
│   ├── env.js              .env → process.env
│   ├── app.js              Middleware-Reihenfolge, Routen, /data, SPA
│   ├── auth.js             Login, signierte Session-Cookies, Rollen, Bremse gegen Durchprobieren
│   ├── config.js           Pfade, Ports, Limits
│   ├── db.js               JSON-Datenbank: atomar schreiben, Backups, Selbstheilung
│   ├── schema.js           Schema-Version, leere DB, Erststart-Inhalte (1. Semester)
│   ├── schema/*.js         ein Normalizer pro Sammlung (Semester, Fächer, Kapitel + Bausteine)
│   ├── http.js             Fehler-Handler, Host-/CSRF-/Security-Header-Guards
│   ├── content.js          Inhaltspakete aus content/ beim Start importieren
│   ├── files.js, upload.js Dateinamen, Pfadprüfung, Uploads
│   └── routes/             catalog (Semester/Fächer), chapters, trash, search
├── src/
│   ├── main.jsx, App.jsx   React-Root, Login-Schranke, Shell, Routen (lazy)
│   ├── pages/              eine Datei pro Seite
│   ├── components/         wiederverwendbare Komponenten, blocks/ = Bausteine
│   ├── lib/                Logik ohne UI (api, auth, autosave, blocks, inline …)
│   └── styles/             base.css + eine Datei pro Bereich (siehe README dort)
├── content/                Inhaltspakete (Kapitel + Abbildungen), einmal importiert
├── tests/                  API-/Unit-Tests (node:test)
├── e2e/                    Browser-Tests (Playwright, Handy + Desktop)
├── scripts/                Lizenz-Check, Icon-Generator
└── docs/                   Architektur, Bausteine, Betrieb
```

## Dokumentation

- [docs/architektur.md](docs/architektur.md) – Aufbau, Datenmodell, Sicherheit, Abweichungen von der Blaupause
- [docs/bausteine.md](docs/bausteine.md) – alle Bausteine, Formatierung, neuen Baustein-Typ hinzufügen
- [docs/betrieb.md](docs/betrieb.md) – Server-Betrieb, HTTPS, Backups, Passwörter ändern
- [src/styles/README.md](src/styles/README.md) – CSS-Regeln, Breakpoints, Tokens

## Lizenzen

Alle Abhängigkeiten stehen unter permissiven Lizenzen (MIT, ISC, Apache-2.0,
BSD, OFL für die Schriften) – prüfbar mit `npm run licenses`. Icons
ausschließlich von lucide (ISC). Das Repository selbst hat keine `LICENSE`
(„alle Rechte vorbehalten“); bei einer Veröffentlichung bitte bewusst eine wählen.
