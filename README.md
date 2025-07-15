# OrderboxAI

**OrderboxAI** ist eine moderne, responsive Web-App zur Organisation von Lieferando-Bestellungen unter Freunden. Die App bietet Live-Updates, eine intuitive Oberfläche, Inline-Bearbeitung (Jira-Style), Summen- und Statusanzeigen sowie eine mobile-optimierte Benutzeroberfläche – ganz ohne Login.

## Features
- **Bestellungen verwalten:** Erstelle, bearbeite und lösche Lieferando-Bestellungen.
- **Besteller & Artikel:** Füge beliebig viele Besteller und Artikel hinzu, bearbeite sie inline.
- **Status-Logik:** Status für Besteller und Bestellung (Offen, Fertig, Bestellt, Bezahlt) mit Live-Synchronisation.
- **Summenanzeige:** Zeigt automatisch Summen pro Besteller und Bestellung an.
- **Live-Updates:** Alle Änderungen werden in Echtzeit an alle Clients übertragen (socket.io).
- **Responsive Design:** Optimiert für Desktop und Smartphone, inkl. Burger-Menü.
- **Dark Mode:** Modernes, kontrastreiches UI.
- **Keine Registrierung nötig:** Sofort nutzbar.

## Projektstruktur
```
OrderboxAI/
  backend/         # Node.js/Express-API, lowdb, socket.io
    server.js      # Hauptserver, API, Websocket-Logik
    db.json        # Persistente Datenbank (JSON)
    package.json   # Backend-Abhängigkeiten
  frontend/        # React (Vite), modernes UI
    src/           # React-Komponenten, CSS
    App.jsx        # Haupt-App
    App.css        # Haupt-Styles (Dark Mode, Responsive)
    package.json   # Frontend-Abhängigkeiten
```

## Installation (lokal)
### Voraussetzungen
- Node.js (empfohlen: v18+)
- npm

### 1. Repository klonen
```sh
git clone https://github.com/DEIN_USERNAME/OrderboxAI.git
cd OrderboxAI
```

### 2. Backend installieren & starten
```sh
cd backend
npm install
node server.js
```
Der Backend-Server läuft standardmäßig auf [http://localhost:3001](http://localhost:3001)

### 3. Frontend installieren & starten
```sh
cd ../frontend
npm install
npm run dev
```
Das Frontend läuft standardmäßig auf [http://localhost:5173](http://localhost:5173)

> **Hinweis:** Die API-URL im Frontend (`src/App.jsx`) muss ggf. auf das Backend angepasst werden (`API_URL`, `SOCKET_URL`).

## Deployment
### Frontend (GitHub Pages)
1. Im Ordner `frontend`:
   - `npm install --save-dev gh-pages`
   - In `package.json` das Feld `"homepage": "https://DEIN_USERNAME.github.io/OrderboxAI"` ergänzen.
   - Scripts ergänzen:
     ```json
     "predeploy": "npm run build",
     "deploy": "gh-pages -d dist"
     ```
   - `npm run deploy`
2. Die App ist unter `https://DEIN_USERNAME.github.io/OrderboxAI` erreichbar.

### Backend (Render)
1. Repository auf GitHub pushen.
2. Bei [render.com](https://render.com/) einloggen, neues Web Service anlegen, als Root `/backend` wählen.
3. Build Command: `npm install`, Start Command: `node server.js`
4. Nach dem Deploy ist das Backend unter einer eigenen URL erreichbar (z.B. `https://orderboxai-backend.onrender.com`).

### API-URL im Frontend anpassen
In `frontend/src/App.jsx`:
```js
const API_URL = 'https://DEIN-BACKEND-URL.onrender.com/api';
const SOCKET_URL = 'https://DEIN-BACKEND-URL.onrender.com';
```

## Screenshots
*(Hier können Screenshots der App eingefügt werden)*

## Lizenz
MIT 
