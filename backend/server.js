const express = require('express');
const { Server } = require('socket.io');
const http = require('http');
const cors = require('cors');
const { Low, JSONFile } = require('lowdb');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(cors());
app.use(express.json());

// Datenbank initialisieren
const dbFile = path.join(__dirname, 'db.json');
const adapter = new JSONFile(dbFile);
const db = new Low(adapter);

async function initDB() {
  await db.read();
  db.data ||= { bestellungen: [] };
  await db.write();
}

initDB();

// Socket.IO Events
io.on('connection', (socket) => {
  console.log('Client connected');
});

// Hilfsfunktionen für Summen und Status
function berechneBestellungSumme(bestellung) {
  return bestellung.artikel.reduce((sum, a) => sum + (parseFloat(a.preis) || 0), 0);
}

function berechneOrderSumme(order) {
  return order.besteller.reduce((sum, b) => sum + berechneBestellungSumme(b), 0);
}

function updateOrderStatus(order) {
  // Wenn alle Besteller bezahlt sind und der Status noch nicht "Bezahlt" ist, setze auf "Bezahlt"
  if (
    order.besteller.length > 0 &&
    order.besteller.every(b => b.status === 'Bezahlt') &&
    order.status !== 'Bezahlt'
  ) {
    order.status = 'Bezahlt';
  }
  // Keine automatische Rücksetzung mehr!
}

function enrichOrder(order) {
  // Summen berechnen und anreichern
  order.summe = berechneOrderSumme(order);
  order.besteller.forEach(b => {
    b.summe = berechneBestellungSumme(b);
  });
  updateOrderStatus(order);
}

// API Endpunkte
app.get('/api/orders', async (req, res) => {
  await db.read();
  db.data.bestellungen.forEach(enrichOrder);
  res.json(db.data.bestellungen);
});

app.post('/api/orders', async (req, res) => {
  await db.read();
  const newOrder = req.body;
  newOrder.id = Date.now().toString();
  newOrder.createdAt = new Date().toISOString();
  newOrder.status = 'Offen';
  newOrder.besteller = [];
  // Neue Felder
  newOrder.bestellername = req.body.bestellername || '';
  newOrder.bezahlart = req.body.bezahlart || '';
  db.data.bestellungen.push(newOrder);
  await db.write();
  io.emit('ordersUpdated');
  res.json(newOrder);
});

app.get('/api/orders/:id', async (req, res) => {
  await db.read();
  const order = db.data.bestellungen.find(o => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: 'Not found' });
  enrichOrder(order);
  res.json(order);
});

app.post('/api/orders/:id/besteller', async (req, res) => {
  await db.read();
  const order = db.data.bestellungen.find(o => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: 'Not found' });
  const besteller = req.body;
  besteller.id = Date.now().toString();
  besteller.status = 'Offen';
  besteller.artikel = [];
  order.besteller.push(besteller);
  enrichOrder(order);
  await db.write();
  io.emit('ordersUpdated');
  res.json(besteller);
});

app.post('/api/orders/:orderId/besteller/:bestellerId/artikel', async (req, res) => {
  await db.read();
  const order = db.data.bestellungen.find(o => o.id === req.params.orderId);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  const besteller = order.besteller.find(b => b.id === req.params.bestellerId);
  if (!besteller) return res.status(404).json({ error: 'Besteller not found' });
  const artikel = req.body;
  artikel.id = Date.now().toString();
  // Anzahl-Feld ergänzen, Standard 1
  artikel.anzahl = typeof artikel.anzahl === 'number' && artikel.anzahl > 0 ? artikel.anzahl : 1;
  besteller.artikel.push(artikel);
  enrichOrder(order);
  await db.write();
  io.emit('ordersUpdated');
  res.json(artikel);
});

app.patch('/api/orders/:orderId/besteller/:bestellerId', async (req, res) => {
  await db.read();
  const order = db.data.bestellungen.find(o => o.id === req.params.orderId);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  const besteller = order.besteller.find(b => b.id === req.params.bestellerId);
  if (!besteller) return res.status(404).json({ error: 'Besteller not found' });
  Object.assign(besteller, req.body);
  enrichOrder(order);
  await db.write();
  io.emit('ordersUpdated');
  res.json(besteller);
});

app.patch('/api/orders/:id', async (req, res) => {
  await db.read();
  const order = db.data.bestellungen.find(o => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: 'Not found' });
  // Status darf nie von 'Bezahlt' zurückgesetzt werden
  if (order.status === 'Bezahlt' && req.body.status && req.body.status !== 'Bezahlt') {
    // Ignoriere Status-Änderung
    delete req.body.status;
  }
  // Neue Felder übernehmen
  if (typeof req.body.bestellername !== 'undefined') order.bestellername = req.body.bestellername;
  if (typeof req.body.bezahlart !== 'undefined') order.bezahlart = req.body.bezahlart;
  Object.assign(order, req.body);
  enrichOrder(order);
  await db.write();
  io.emit('ordersUpdated');
  res.json(order);
});

// DELETE Besteller
app.delete('/api/orders/:orderId/besteller/:bestellerId', async (req, res) => {
  await db.read();
  const order = db.data.bestellungen.find(o => o.id === req.params.orderId);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  const idx = order.besteller.findIndex(b => b.id === req.params.bestellerId);
  if (idx === -1) return res.status(404).json({ error: 'Besteller not found' });
  order.besteller.splice(idx, 1);
  enrichOrder(order);
  await db.write();
  io.emit('ordersUpdated');
  res.json({ success: true });
});

// DELETE Artikel
app.delete('/api/orders/:orderId/besteller/:bestellerId/artikel/:artikelId', async (req, res) => {
  await db.read();
  const order = db.data.bestellungen.find(o => o.id === req.params.orderId);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  const besteller = order.besteller.find(b => b.id === req.params.bestellerId);
  if (!besteller) return res.status(404).json({ error: 'Besteller not found' });
  const idx = besteller.artikel.findIndex(a => a.id === req.params.artikelId);
  if (idx === -1) return res.status(404).json({ error: 'Artikel not found' });
  besteller.artikel.splice(idx, 1);
  enrichOrder(order);
  await db.write();
  io.emit('ordersUpdated');
  res.json({ success: true });
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`Server läuft auf http://localhost:${PORT}`);
}); 