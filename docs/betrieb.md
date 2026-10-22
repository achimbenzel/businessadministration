# Betrieb

## Lokal

```bash
npm install
cp .env.example .env    # Passwörter eintragen
npm run build && npm start
```

Die App läuft dann auf `http://127.0.0.1:4300` – nur auf diesem Rechner erreichbar.

## Auf einem Server (z. B. für die Lerngruppe)

Die App hat einen Login und kann deshalb ins Internet – aber **nur über HTTPS**,
sonst gehen Passwort und Session-Cookie im Klartext übers Netz.

1. Node.js ≥ 20.12 installieren, Repository klonen, `npm ci && npm run build`.
2. `.env` anlegen:
   ```ini
   USER_PASSWORD=<langes Passwort>
   ADMIN_PASSWORD=<anderes langes Passwort>
   SESSION_SECRET=<node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">
   ALLOWED_HOSTS=lernen.example.de
   ```
3. Den Server auf `127.0.0.1` lassen und einen Reverse-Proxy mit HTTPS davor
   setzen. Mit Caddy reicht:
   ```
   lernen.example.de {
     reverse_proxy 127.0.0.1:4300
   }
   ```
   Der Proxy auf demselben Rechner gilt als vertrauenswürdig (`TRUST_PROXY=loopback`):
   Das Cookie bekommt dann automatisch `Secure`, und die Login-Bremse sieht die
   echte IP des Nutzers.
4. Als Dienst starten, z. B. mit systemd:
   ```ini
   [Service]
   WorkingDirectory=/opt/ba-lernplattform
   ExecStart=/usr/bin/npm start
   Restart=on-failure
   User=ba
   ```

Fürs Handy im eigenen Netz ohne Domain: Tailscale (`*.ts.net` ist als Host erlaubt).

## Passwörter ändern

Neues Passwort in die `.env` schreiben und den Server neu starten. Alle Geräte
werden dabei abgemeldet (das Session-Cookie ist an die Passwörter gebunden).

## Backups

Alle Inhalte liegen in `data/`:

- `data/db.json` – Semester, Fächer, Kapitel, Papierkorb
- `data/chapters/` – hochgeladene Dateien
- `data/backups/` – automatische Snapshots der Datenbank (die letzten 10)

Für ein Backup genügt es, den ganzen Ordner `data/` zu kopieren. Wiederherstellen:
Server stoppen, `data/` zurückkopieren (oder einen Snapshot aus `data/backups/`
als `data/db.json` ablegen), Server starten.

## Grenzen des MVP

- Gelöschte Bilder/Dateien eines Bausteins bleiben auf der Platte, bis das ganze
  Kapitel aus dem Papierkorb gelöscht wird.
- Keine Live-Aktualisierung zwischen Geräten; gleichzeitiges Bearbeiten desselben
  Kapitels wird erkannt (409) statt zusammengeführt.
- Kein Offline-Modus (Service Worker).
- Der Lernfortschritt liegt pro Gerät im Browser, nicht auf dem Server.
