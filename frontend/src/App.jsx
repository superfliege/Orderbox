import { useEffect, useState } from 'react';
import './App.css';
import { io } from 'socket.io-client';

const API_URL = 'http://localhost:3001/api';
const SOCKET_URL = 'http://localhost:3001';

function App() {
  const [bestellungen, setBestellungen] = useState([]);
  const [selectedBestellung, setSelectedBestellung] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showBestellungForm, setShowBestellungForm] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // Entferne editOrderId/editOrderName aus App-State

  // Im App-Component: State für neue Felder
  const [newBestellername, setNewBestellername] = useState('');
  const [newBezahlart, setNewBezahlart] = useState('');

  // Socket.IO für Live-Updates
  useEffect(() => {
    const socket = io(SOCKET_URL);
    socket.on('ordersUpdated', fetchBestellungen);
    return () => socket.disconnect();
    // eslint-disable-next-line
  }, []);

  // Initiale Daten laden
  useEffect(() => {
    fetchBestellungen();
  }, []);

  // Synchronisiere selectedBestellung nach jedem Live-Update
  useEffect(() => {
    if (!selectedBestellung) return;
    const found = bestellungen.find(b => b.id === selectedBestellung.id);
    if (found && found !== selectedBestellung) {
      setSelectedBestellung(found);
    }
  }, [bestellungen, selectedBestellung]);

  async function fetchBestellungen() {
    setLoading(true);
    const res = await fetch(`${API_URL}/orders`);
    const data = await res.json();
    setBestellungen(data);
    setLoading(false);
    if (selectedBestellung) {
      // Details aktualisieren, falls offen
      const found = data.find(o => o.id === selectedBestellung.id);
      setSelectedBestellung(found || null);
    }
  }

  async function handleCreateBestellung(e) {
    e.preventDefault();
    const form = e.target;
    const name = form.name.value.trim();
    const bestellername = form.bestellername.value.trim();
    const bezahlart = form.bezahlart.value.trim();
    if (!name) return;
    await fetch(`${API_URL}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, bestellername, bezahlart })
    });
    setShowBestellungForm(false);
    setNewBestellername('');
    setNewBezahlart('');
    fetchBestellungen();
  }

  // Entferne Bearbeiten-Logik aus Sidebar

  // Responsive: Sidebar als Drawer auf Mobile
  function handleSidebarToggle() {
    setSidebarOpen(v => !v);
  }
  function handleSidebarClose() {
    setSidebarOpen(false);
  }

  return (
    <>
      <header className="orderbox-header">
        <div className="orderbox-header-inner">
          <button className="burger-btn" onClick={handleSidebarToggle} aria-label="Menü" style={{ display: 'none' }}>
            &#9776;
          </button>
          <span className="orderbox-title">OrderBoxAI</span>
          <span className="orderbox-slogan">Bestellt von Freunden, gebaut mit AI &amp; Cursor – weniger Bugs, mehr Pizza!</span>
        </div>
      </header>
      <div className={`sidebar-overlay${sidebarOpen ? ' open' : ''}`} onClick={handleSidebarClose}></div>
      <aside className={`sidebar${sidebarOpen ? ' open' : ''}`}>
        <button className="close-btn" onClick={handleSidebarClose} aria-label="Schließen" style={{ display: 'none' }}>
          &times;
        </button>
        <h2>Bestellungen</h2>
        <button className="primary-btn" onClick={() => setShowBestellungForm(v => !v)} style={{ margin: '12px 0 16px 0', width: '100%' }}>
          + Neue Bestellung
        </button>
        <div className="sidebar-divider"></div>
        {showBestellungForm && (
          <form className="order-form" onSubmit={handleCreateBestellung} style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <input name="name" placeholder="Name der Bestellung" required style={{ width: '100%' }} />
            <input name="bestellername" placeholder="Bestellername" value={newBestellername} onChange={e => setNewBestellername(e.target.value)} required style={{ width: '100%' }} />
            <input name="bezahlart" placeholder="Bezahlart" value={newBezahlart} onChange={e => setNewBezahlart(e.target.value)} required style={{ width: '100%' }} />
            <button className="primary-btn" type="submit" style={{ width: '100%' }}>Anlegen</button>
          </form>
        )}
        {loading ? <p>Lade...</p> : (
          <ul className="order-list">
            {[...bestellungen]
              .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
              .map(bestellung => {
                // Korrekte Gesamtsumme berechnen (Preis * Anzahl)
                let summe = 0;
                bestellung.besteller?.forEach(b => {
                  b.artikel?.forEach(a => {
                    const preis = parseFloat(a.preis) || 0;
                    const anzahl = Number(a.anzahl) > 0 ? Number(a.anzahl) : 1;
                    summe += preis * anzahl;
                  });
                });
                return (
                  <li key={bestellung.id}>
                    <button
                      className={
                        (selectedBestellung?.id === bestellung.id ? 'order-btn selected' : 'order-btn') +
                        (isToday(bestellung.createdAt) ? ' order-btn-today' : '')
                      }
                      onClick={() => {
                        setSelectedBestellung(bestellung);
                        setSidebarOpen(false);
                      }}
                    >
                      <span className="order-title">{bestellung.name || 'Lieferando-Bestellung'}</span><br />
                      <span className="order-meta">{bestellung.bestellername || '–'} · {bestellung.bezahlart || '–'}</span><br />
                      <small>{new Date(bestellung.createdAt).toLocaleString()}</small><br />
                      <b>Status:</b> <span className={`status-badge status-badge-${bestellung.status}`}>{bestellung.status}</span><br />
                      <b>Gesamt:</b> {summe.toFixed(2)} €
                    </button>
                  </li>
                );
              })}
          </ul>
        )}
      </aside>
      <div className="orderbox-root responsive-flex">
        <main className="main-content">
          {selectedBestellung ? (
            <BestellungDetail bestellung={selectedBestellung} refresh={fetchBestellungen} />
          ) : (
            <p>Wähle eine Lieferandobestellung aus.</p>
          )}
        </main>
      </div>
    </>
  );
}

function isToday(dateString) {
  const d = new Date(dateString);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
}

// Levenshtein-Distanz Funktion
function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a || !b) return (a || b).length;
  const matrix = Array.from({ length: a.length + 1 }, () => []);
  for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
  }
  return matrix[a.length][b.length];
}

// OrderDetail: Name editierbar machen
function BestellungDetail({ bestellung, refresh }) {
  const [showBestellerForm, setShowBestellerForm] = useState(false);
  const [bestellerName, setBestellerName] = useState('');
  const [status, setStatus] = useState(bestellung.status);
  const [nameValue, setNameValue] = useState(bestellung.name || '');
  const [editingName, setEditingName] = useState(false);
  const [bestellernameValue, setBestellernameValue] = useState(bestellung.bestellername || '');
  const [editingBestellername, setEditingBestellername] = useState(false);
  const [bezahlartValue, setBezahlartValue] = useState(bestellung.bezahlart || '');
  const [editingBezahlart, setEditingBezahlart] = useState(false);

  useEffect(() => { setStatus(bestellung.status); }, [bestellung.status]);
  useEffect(() => { setNameValue(bestellung.name || ''); }, [bestellung.name]);
  useEffect(() => { setBestellernameValue(bestellung.bestellername || ''); }, [bestellung.bestellername]);
  useEffect(() => { setBezahlartValue(bestellung.bezahlart || ''); }, [bestellung.bezahlart]);

  function saveName() {
    if (!nameValue.trim()) { setEditingName(false); return; }
    fetch(`http://localhost:3001/api/orders/${bestellung.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: nameValue })
    }).then(() => { setEditingName(false); refresh(); });
  }

  async function handleStatusChange(e) {
    const newStatus = e.target.value;
    setStatus(newStatus);
    await fetch(`http://localhost:3001/api/orders/${bestellung.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });
    refresh();
  }

  async function handleNameSave(e) {
    e.preventDefault();
    if (!nameValue.trim()) return;
    await fetch(`http://localhost:3001/api/orders/${bestellung.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: nameValue })
    });
    setEditingName(false);
    refresh();
  }

  function handleNameCancel() {
    setEditingName(false);
    setNameValue(bestellung.name || '');
  }

  function saveBestellername() {
    if (!bestellernameValue.trim()) { setEditingBestellername(false); return; }
    fetch(`http://localhost:3001/api/orders/${bestellung.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bestellername: bestellernameValue })
    }).then(() => { setEditingBestellername(false); refresh(); });
  }
  function saveBezahlart() {
    if (!bezahlartValue.trim()) { setEditingBezahlart(false); return; }
    fetch(`http://localhost:3001/api/orders/${bestellung.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bezahlart: bezahlartValue })
    }).then(() => { setEditingBezahlart(false); refresh(); });
  }

  async function handleCreateBesteller(e) {
    e.preventDefault();
    if (!bestellerName.trim()) return;
    await fetch(`http://localhost:3001/api/orders/${bestellung.id}/besteller`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: bestellerName })
    });
    setShowBestellerForm(false);
    setBestellerName('');
    refresh();
  }

  async function handleDeleteBesteller(bestellerId) {
    if (!window.confirm('Diesen Besteller wirklich löschen?')) return;
    await fetch(`http://localhost:3001/api/orders/${bestellung.id}/besteller/${bestellerId}`, {
      method: 'DELETE'
    });
    refresh();
  }

  // Gesamtsumme der Bestellung (über alle Besteller, Preis * Anzahl)
  function calcOrderSumme() {
    let sum = 0;
    bestellung.besteller?.forEach(b => {
      b.artikel?.forEach(a => {
        const preis = parseFloat(a.preis) || 0;
        const anzahl = Number(a.anzahl) > 0 ? Number(a.anzahl) : 1;
        sum += preis * anzahl;
      });
    });
    return sum;
  }

  return (
    <div className="order-detail">
      <div className="order-head">
        <div className="order-head-row">
          <h1 className="order-head-title" onClick={() => setEditingName(true)} style={{ display: 'inline-block', marginRight: 16 }}>
            {editingName ? (
              <input value={nameValue} onChange={e => setNameValue(e.target.value)} onBlur={saveName} onKeyDown={e => { if (e.key === 'Enter') saveName(); }} autoFocus style={{ fontSize: '1.2em', fontWeight: 600 }} />
            ) : (
              bestellung.name || 'Bestellung'
            )}
          </h1>
          {bestellung.besteller?.length > 0 && bestellung.besteller.every(b => b.status === 'Fertig') && bestellung.status !== 'Bestellt' && (
            <span className="order-head-ready" style={{ marginLeft: 12 }}>Bereit für Bestellung</span>
          )}
          <span className="order-head-sum">{calcOrderSumme().toFixed(2)} €</span>
        </div>
        <div className="order-head-row" style={{ marginTop: 6, gap: 32 }}>
          <div style={{ minWidth: 180, fontSize: '1.08em' }}>
            <b>Bestellername:</b>{' '}
            {editingBestellername ? (
              <input value={bestellernameValue} onChange={e => setBestellernameValue(e.target.value)} onBlur={saveBestellername} onKeyDown={e => { if (e.key === 'Enter') saveBestellername(); }} autoFocus style={{ fontWeight: 500, fontSize: '1em', maxWidth: 180 }} />
            ) : (
              <span style={{ cursor: 'pointer', fontWeight: 500, color: 'var(--text-accent)' }} onClick={() => setEditingBestellername(true)}>{bestellung.bestellername || <span style={{ color: '#888' }}>–</span>}</span>
            )}
          </div>
          <div style={{ minWidth: 140, fontSize: '1.08em' }}>
            <b>Bezahlart:</b>{' '}
            {editingBezahlart ? (
              <input value={bezahlartValue} onChange={e => setBezahlartValue(e.target.value)} onBlur={saveBezahlart} onKeyDown={e => { if (e.key === 'Enter') saveBezahlart(); }} autoFocus style={{ fontWeight: 500, fontSize: '1em', maxWidth: 120 }} />
            ) : (
              <span style={{ cursor: 'pointer', fontWeight: 500, color: 'var(--text-accent)' }} onClick={() => setEditingBezahlart(true)}>{bestellung.bezahlart || <span style={{ color: '#888' }}>–</span>}</span>
            )}
          </div>
        </div>
        <div className="order-head-row order-head-meta">
          <span className="order-head-date"><b>Erstellt am:</b> {new Date(bestellung.createdAt).toLocaleString()}</span>
          <span className="order-head-status">
            <b>Status:</b>{' '}
            <select
              value={status}
              onChange={handleStatusChange}
              disabled={bestellung.status === 'Bezahlt'}
              className={
                status === 'Bezahlt' ? 'status-paid' : status === 'Bestellt' ? 'status-ordered' : 'status-open'
              }
            >
              <option value="Offen">Offen</option>
              <option value="Bestellt">Bestellt</option>
              <option value="Bezahlt" disabled={status !== 'Bezahlt'}>Bezahlt</option>
            </select>
          </span>
        </div>
      </div>
      {/* Artikelsummary zwischen Header und Bestellerliste */}
      {(() => {
        // Alle Artikel aller Besteller sammeln und ähnlich geschriebene zusammenfassen
        const artikelMap = [];
        const maxDist = 2; // 2-3 Zeichen Abweichung zulassen
        bestellung.besteller?.forEach(b => {
          b.artikel?.forEach(a => {
            if (!a.beschreibung) return;
            const beschr = a.beschreibung.trim();
            const anzahl = Number(a.anzahl) > 0 ? Number(a.anzahl) : 1;
            // Versuche, einen existierenden Eintrag mit ähnlicher Beschreibung zu finden
            let found = false;
            for (let entry of artikelMap) {
              if (levenshtein(entry.name, beschr) <= maxDist) {
                entry.count += anzahl;
                found = true;
                break;
              }
            }
            if (!found) {
              artikelMap.push({ name: beschr, count: anzahl });
            }
          });
        });
        if (artikelMap.length === 0) return null;
        artikelMap.sort((a, b) => b.count - a.count);
        return (
          <div className="artikel-summary" style={{ margin: '18px 0 10px 0', background: 'var(--bg-btn)', borderRadius: 10, padding: '14px 22px', boxShadow: '0 1px 6px rgba(0,0,0,0.08)' }}>
            <b>Zusammenfassung:</b>
            <ul style={{ margin: '8px 0 0 0', padding: 0, listStyle: 'none', display: 'flex', flexWrap: 'wrap', gap: '18px' }}>
              {artikelMap.map(({ name, count }) => (
                <li key={name} style={{ fontSize: '1.08em', color: 'var(--text-main)', fontWeight: 500 }}>
                  {count}× {name}
                </li>
              ))}
            </ul>
          </div>
        );
      })()}
      <h3>Besteller</h3>
      {!showBestellerForm && (
        <button className="primary-btn" onClick={() => setShowBestellerForm(true)} style={{ margin: '8px 0 16px 0' }}>
          + Neuer Besteller
        </button>
      )}
      {showBestellerForm && (
        <form className="bestellung-form" onSubmit={handleCreateBesteller} style={{ margin: '8px 0 16px 0', display: 'flex', gap: 8, alignItems: 'center', maxWidth: 420 }}>
          <input value={bestellerName} onChange={e => setBestellerName(e.target.value)} placeholder="Name des Bestellers" required style={{ marginRight: 8, flex: 2 }} />
          <button className="primary-btn" type="submit" style={{ flex: 1, minWidth: 120 }}>Hinzufügen</button>
        </form>
      )}
      {bestellung.besteller?.length ? (
        <ul className="bestellung-list">
          {bestellung.besteller.map(b => (
            <li key={b.id} className="bestellung-item">
              <BestellerDetail bestellung={b} orderId={bestellung.id} refresh={refresh} orderStatus={bestellung.status} />
            </li>
          ))}
        </ul>
      ) : <p>Keine Besteller.</p>}
    </div>
  );
}

function BestellerDetail({ bestellung, orderId, refresh, orderStatus }) {
  const [showArtikelForm, setShowArtikelForm] = useState(false);
  const [artikelDesc, setArtikelDesc] = useState('');
  const [artikelPreis, setArtikelPreis] = useState('');
  const [artikelAnzahl, setArtikelAnzahl] = useState(1);
  const [status, setStatus] = useState(bestellung.status);
  const [nameValue, setNameValue] = useState(bestellung.name || '');
  const [editingName, setEditingName] = useState(false);
  const [editingArtikel, setEditingArtikel] = useState({ idx: null, field: null });
  const [editArtikel, setEditArtikel] = useState(bestellung.artikel.map(a => ({ ...a })));

  useEffect(() => { setStatus(bestellung.status); }, [bestellung.status]);
  useEffect(() => { setNameValue(bestellung.name || ''); }, [bestellung.name]);
  useEffect(() => { setEditArtikel(bestellung.artikel.map(a => ({ ...a }))); }, [bestellung.artikel]);

  function saveBestellerName() {
    if (!nameValue.trim()) { setEditingName(false); return; }
    fetch(`http://localhost:3001/api/orders/${orderId}/besteller/${bestellung.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: nameValue })
    }).then(() => { setEditingName(false); refresh(); });
  }
  function saveArtikelField(idx, field, value) {
    const newArtikel = [...editArtikel];
    newArtikel[idx][field] = value;
    setEditArtikel(newArtikel);
    fetch(`http://localhost:3001/api/orders/${orderId}/besteller/${bestellung.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ artikel: newArtikel, name: nameValue })
    }).then(() => { setEditingArtikel({ idx: null, field: null }); refresh(); });
  }

  async function handleStatusChange(e) {
    const newStatus = e.target.value;
    setStatus(newStatus);
    await fetch(`http://localhost:3001/api/orders/${orderId}/besteller/${bestellung.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });
    refresh();
  }

  async function handleCreateArtikel(e) {
    if (e && e.preventDefault) e.preventDefault();
    if (!artikelDesc.trim() || !artikelPreis.trim() || !artikelAnzahl) return;
    await fetch(`http://localhost:3001/api/orders/${orderId}/besteller/${bestellung.id}/artikel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ beschreibung: artikelDesc, preis: artikelPreis, anzahl: Number(artikelAnzahl) || 1 })
    });
    setShowArtikelForm(false);
    setArtikelDesc('');
    setArtikelPreis('');
    setArtikelAnzahl(1);
    refresh();
  }

  function handleEditArtikelChange(idx, field, value) {
    setEditArtikel(arts => arts.map((a, i) => i === idx ? { ...a, [field]: value } : a));
  }

  function handleRemoveArtikel(idx) {
    setEditArtikel(arts => arts.filter((_, i) => i !== idx));
  }

  async function handleEditSave() {
    // PATCH für Name und Artikel (ersetze Artikel komplett)
    await fetch(`http://localhost:3001/api/orders/${orderId}/besteller/${bestellung.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: nameValue, artikel: editArtikel })
    });
    refresh();
  }

  function handleEditCancel() {
    setEditingName(false);
    setNameValue(bestellung.name || '');
    setEditArtikel(bestellung.artikel.map(a => ({ ...a })));
  }

  async function handleDeleteArtikel(artikelId) {
    console.log('DELETE Artikel:', {
      url: `http://localhost:3001/api/orders/${orderId}/besteller/${bestellung.id}/artikel/${artikelId}`,
      orderId,
      bestellerId: bestellung.id,
      artikelId
    });
    if (!window.confirm('Diesen Artikel wirklich löschen?')) return;
    await fetch(`http://localhost:3001/api/orders/${orderId}/besteller/${bestellung.id}/artikel/${artikelId}`, {
      method: 'DELETE'
    });
    refresh();
  }

  // Gesamtsumme für diesen Besteller (Preis * Anzahl)
  function calcBestellerSumme() {
    return bestellung.artikel?.reduce((sum, a) => {
      const preis = parseFloat(a.preis) || 0;
      const anzahl = Number(a.anzahl) > 0 ? Number(a.anzahl) : 1;
      return sum + preis * anzahl;
    }, 0) || 0;
  }

  return (
    <div className="bestellung-detail">
      <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 8 }}>
        <h2 style={{ fontSize: '1.5em', fontWeight: 700, margin: 0, flex: 1, color: 'var(--text-accent)', cursor: 'pointer' }} onClick={() => setEditingName(true)}>
          {editingName ? (
            <input value={nameValue} onChange={e => setNameValue(e.target.value)} onBlur={saveBestellerName} onKeyDown={e => { if (e.key === 'Enter') saveBestellerName(); }} autoFocus style={{ fontWeight: 600, fontSize: '1em', maxWidth: 220 }} />
          ) : (
            bestellung.name
          )}
        </h2>
        <span style={{ fontWeight: 700, fontSize: '1.15em', color: 'var(--text-main)', minWidth: 90, textAlign: 'right' }}>{calcBestellerSumme().toFixed(2)} €</span>
      </div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginBottom: 8 }}>
        <div>
          <b>Status:</b>{' '}
          <select value={status} onChange={handleStatusChange}>
            <option value="Offen">Offen</option>
            <option value="Fertig">Fertig</option>
            <option value="Bezahlt">Bezahlt</option>
          </select>
        </div>
      </div>
      {/* editMode ist nicht mehr vorhanden, daher kein if-Block */}
      <table className="artikel-tabelle">
        <thead>
          <tr>
            <th>Beschreibung</th>
            <th>Anzahl</th>
            <th>Preis</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {editArtikel.map((a, idx) => (
            <tr key={a.id}>
              <td style={{ cursor: 'pointer', width: '40%' }} onClick={() => setEditingArtikel({ idx, field: 'beschreibung' })}>
                {editingArtikel.idx === idx && editingArtikel.field === 'beschreibung' ? (
                  <input
                    value={editArtikel[idx].beschreibung}
                    onChange={e => handleEditArtikelChange(idx, 'beschreibung', e.target.value)}
                    onBlur={e => saveArtikelField(idx, 'beschreibung', e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') saveArtikelField(idx, 'beschreibung', e.target.value); }}
                    autoFocus
                    style={{ width: '100%', fontSize: '1em', padding: '8px 10px', boxSizing: 'border-box' }}
                  />
                ) : (
                  a.beschreibung || <span style={{ color: '#888' }}>–</span>
                )}
              </td>
              <td style={{ cursor: 'pointer', width: '15%' }} onClick={() => setEditingArtikel({ idx, field: 'anzahl' })}>
                {editingArtikel.idx === idx && editingArtikel.field === 'anzahl' ? (
                  <input
                    type="number"
                    min={1}
                    value={editArtikel[idx].anzahl || 1}
                    onChange={e => handleEditArtikelChange(idx, 'anzahl', e.target.value)}
                    onBlur={e => saveArtikelField(idx, 'anzahl', Number(e.target.value) || 1)}
                    onKeyDown={e => { if (e.key === 'Enter') saveArtikelField(idx, 'anzahl', Number(e.target.value) || 1); }}
                    autoFocus
                    style={{ width: '100%', fontSize: '1em', padding: '8px 10px', boxSizing: 'border-box' }}
                  />
                ) : (
                  a.anzahl || 1
                )}
              </td>
              <td style={{ cursor: 'pointer', width: '25%' }} onClick={() => setEditingArtikel({ idx, field: 'preis' })}>
                {editingArtikel.idx === idx && editingArtikel.field === 'preis' ? (
                  <input
                    value={editArtikel[idx].preis}
                    onChange={e => handleEditArtikelChange(idx, 'preis', e.target.value)}
                    onBlur={e => saveArtikelField(idx, 'preis', e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') saveArtikelField(idx, 'preis', e.target.value); }}
                    autoFocus
                    type="number"
                    min="0"
                    step="0.01"
                    style={{ width: '100%', fontSize: '1em', padding: '8px 10px', boxSizing: 'border-box' }}
                  />
                ) : (
                  a.preis !== undefined && a.preis !== '' ? Number(a.preis).toFixed(2) + ' €' : <span style={{ color: '#888' }}>–</span>
                )}
              </td>
              <td style={{ width: '15%' }}>
                <button className="secondary-btn" type="button" onClick={() => handleDeleteArtikel(a.id)} style={{ padding: '2px 8px' }}>🗑</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {showArtikelForm && !editingName && (
        <form className="artikel-form" onSubmit={e => { e.preventDefault(); handleCreateArtikel(); }} style={{ marginTop: 8, display: 'flex', gap: 6, alignItems: 'center', width: '100%', maxWidth: 520 }}>
          <input
            value={artikelDesc}
            onChange={e => setArtikelDesc(e.target.value)}
            placeholder="Beschreibung"
            required
            style={{ flex: 2, fontSize: '1em', padding: '8px 10px', boxSizing: 'border-box' }}
            autoFocus
          />
          <input
            type="number"
            min={1}
            value={artikelAnzahl}
            onChange={e => setArtikelAnzahl(e.target.value)}
            placeholder="Anzahl"
            required
            style={{ flex: 1, fontSize: '1em', padding: '8px 10px', boxSizing: 'border-box' }}
          />
          <input
            value={artikelPreis}
            onChange={e => setArtikelPreis(e.target.value)}
            placeholder="Preis (€)"
            required
            type="number"
            min="0"
            step="0.01"
            style={{ flex: 1, fontSize: '1em', padding: '8px 10px', boxSizing: 'border-box' }}
          />
          <button className="primary-btn" type="submit" style={{ fontSize: '1.2em' }} title="Hinzufügen">+</button>
          <button className="secondary-btn" type="button" onClick={() => { setShowArtikelForm(false); setArtikelDesc(''); setArtikelPreis(''); setArtikelAnzahl(1); }} style={{ fontSize: '1.2em' }} title="Abbrechen">×</button>
        </form>
      )}
      {!editingName && !showArtikelForm && (
        <button className="secondary-btn" onClick={() => setShowArtikelForm(true)} style={{ marginTop: 8 }}>
          + Artikel
        </button>
      )}
    </div>
  );
}

export default App;
