import express from 'express';
import { createServer as createViteServer } from 'vite';
import { WebSocketServer, WebSocket } from 'ws';
import ImageKit from 'imagekit';
import dotenv from 'dotenv';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import db from './db.js';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// --- WebSocket Setup ---
const server = app.listen(3000, '0.0.0.0', () => {
  console.log(`Server running on http://localhost:3000`);
});

const wss = new WebSocketServer({ noServer: true });

server.on('upgrade', (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request);
  });
});

const broadcast = (type: string, data: any) => {
  const message = JSON.stringify({ type, data });
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
};

wss.on('connection', (ws) => {
  console.log('[WS] Client connected');
  
  // Send initial data for all collections
  const collections = [
    { type: 'products', table: 'products' },
    { type: 'orders', table: 'orders' },
    { type: 'users', table: 'users' },
    { type: 'activity', table: 'activity' },
    { type: 'withdrawals', table: 'withdrawals' },
    { type: 'auctions', table: 'auctions' },
    { type: 'wallet_transactions', table: 'wallet_transactions' },
    { type: 'notifications', table: 'notifications' },
    { type: 'livestock', table: 'livestock' },
    { type: 'livestock_health', table: 'livestock_health' },
    { type: 'vaccination_records', table: 'vaccination_records' },
    { type: 'medical_records', table: 'medical_records' },
    { type: 'breeding_records', table: 'breeding_records' },
    { type: 'production_records', table: 'production_records' },
    { type: 'nutrition_records', table: 'nutrition_records' },
    { type: 'recurring_orders', table: 'recurring_orders' },
    { type: 'live_sessions', table: 'live_sessions' },
    { type: 'academy', table: 'academy' },
    { type: 'loyalty', table: 'loyalty' },
    { type: 'invoices', table: 'invoices' },
    { type: 'forum', table: 'forum' },
    { type: 'chat', table: 'chat' },
    { type: 'settings', table: 'settings', single: true }
  ];

  collections.forEach(({ type, table, single }) => {
    if (single) {
      const data = db.prepare(`SELECT * FROM ${table} LIMIT 1`).get();
      ws.send(JSON.stringify({ type: `kuku_config:settings`, data }));
    } else {
      const data = db.prepare(`SELECT * FROM ${table} ORDER BY createdAt DESC`).all();
      ws.send(JSON.stringify({ type: `kuku_${type}`, data }));
    }
  });
});

// --- API Endpoints ---

// --- Generic API Endpoints for Firestore-like operations ---

const ALLOWED_COLLECTIONS = [
  'products', 'orders', 'users', 'activity', 'withdrawals', 'auctions', 
  'wallet_transactions', 'notifications', 'settings', 'bids',
  'livestock', 'livestock_health', 'vaccination_records', 'medical_records', 'breeding_records',
  'production_records', 'nutrition_records', 'recurring_orders',
  'live_sessions', 'academy', 'loyalty', 'invoices', 'forum', 'chat', 'live_chats'
];

app.get('/api/:collection', (req, res) => {
  const { collection } = req.params;
  if (!ALLOWED_COLLECTIONS.includes(collection)) return res.status(404).json({ error: 'Collection not found' });
  
  const data = db.prepare(`SELECT * FROM ${collection} ORDER BY createdAt DESC`).all();
  res.json(data.map(item => ({ ...item, id: item.id || item.userId })));
});

app.get('/api/:collection/:id', (req, res) => {
  const { collection, id } = req.params;
  if (!ALLOWED_COLLECTIONS.includes(collection)) return res.status(404).json({ error: 'Collection not found' });
  
  const item = db.prepare(`SELECT * FROM ${collection} WHERE id = ?`).get(id);
  if (!item) return res.status(404).json({ error: 'Item not found' });
  res.json(item);
});

app.post('/api/:collection', (req, res) => {
  const { collection } = req.params;
  if (!ALLOWED_COLLECTIONS.includes(collection)) return res.status(404).json({ error: 'Collection not found' });
  
  try {
    const data = req.body;
    const id = data.id || uuidv4();
    const fields = Object.keys(data).filter(k => k !== 'id');
    const values = fields.map(f => data[f]);
    
    const query = `INSERT INTO ${collection} (id, ${fields.join(', ')}) VALUES (?, ${fields.map(() => '?').join(', ')})`;
    db.prepare(query).run(id, ...values);
    
    broadcast(`kuku_${collection}`, db.prepare(`SELECT * FROM ${collection} ORDER BY createdAt DESC`).all());
    res.json({ id, ...data });
  } catch (error: any) {
    console.error(`Error inserting into ${collection}:`, error);
    res.status(500).json({ error: error.message });
  }
});

app.patch('/api/:collection/:id', (req, res) => {
  const { collection, id } = req.params;
  if (!ALLOWED_COLLECTIONS.includes(collection)) return res.status(404).json({ error: 'Collection not found' });
  
  try {
    const updates = req.body;
    const current = db.prepare(`SELECT * FROM ${collection} WHERE id = ?`).get(id) as any;
    if (!current) return res.status(404).json({ error: 'Item not found' });

    const fields = Object.keys(updates);
    const values: any[] = [];
    
    const setClauses = fields.map(field => {
      const val = updates[field];
      if (val && typeof val === 'object' && val.type === 'increment') {
        return `${field} = ${field} + ?`;
      }
      if (val && typeof val === 'object' && val.type === 'arrayUnion') {
        // Simple array handling for SQLite (stored as JSON string)
        const existing = JSON.parse(current[field] || '[]');
        const updated = [...new Set([...existing, ...val.args])];
        values.push(JSON.stringify(updated));
        return `${field} = ?`;
      }
      if (val && typeof val === 'object' && val.type === 'arrayRemove') {
        const existing = JSON.parse(current[field] || '[]');
        const updated = existing.filter((item: any) => !val.args.includes(item));
        values.push(JSON.stringify(updated));
        return `${field} = ?`;
      }
      
      values.push(typeof val === 'object' ? JSON.stringify(val) : val);
      return `${field} = ?`;
    });

    // Add increment values if any
    fields.forEach(field => {
      const val = updates[field];
      if (val && typeof val === 'object' && val.type === 'increment') {
        values.push(val.value);
      }
    });

    const query = `UPDATE ${collection} SET ${setClauses.join(', ')} WHERE id = ?`;
    db.prepare(query).run(...values, id);
    
    broadcast(`kuku_${collection}`, db.prepare(`SELECT * FROM ${collection} ORDER BY createdAt DESC`).all());
    res.json({ id, ...updates });
  } catch (error: any) {
    console.error(`Error updating ${collection}:`, error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/:collection/:id', (req, res) => {
  const { collection, id } = req.params;
  if (!ALLOWED_COLLECTIONS.includes(collection)) return res.status(404).json({ error: 'Collection not found' });
  
  try {
    db.prepare(`DELETE FROM ${collection} WHERE id = ?`).run(id);
    broadcast(`kuku_${collection}`, db.prepare(`SELECT * FROM ${collection} ORDER BY createdAt DESC`).all());
    res.json({ success: true });
  } catch (error: any) {
    console.error(`Error deleting from ${collection}:`, error);
    res.status(500).json({ error: error.message });
  }
});

// Auth Mock
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
  
  if (user) {
    res.json(user);
  } else {
    // Auto-register for demo purposes
    const id = uuidv4();
    const newUser = {
      id,
      name: email.split('@')[0],
      email,
      role: email.includes('admin') ? 'admin' : (email.includes('vendor') ? 'vendor' : 'user'),
      walletBalance: 0,
      createdAt: new Date().toISOString()
    };
    db.prepare('INSERT INTO users (id, name, email, role, walletBalance) VALUES (?, ?, ?, ?, ?)').run(
      newUser.id, newUser.name, newUser.email, newUser.role, newUser.walletBalance
    );
    res.json(newUser);
  }
});

// Wallet
app.get('/api/wallet/:vendorId', (req, res) => {
  const { vendorId } = req.params;
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(vendorId) as any;
  const transactions = db.prepare('SELECT * FROM wallet_transactions WHERE userId = ? ORDER BY createdAt DESC LIMIT 50').all(vendorId);
  
  res.json({
    balance: user?.walletBalance || 0,
    vendorName: user?.shopName || user?.name || 'Mtumiaji',
    transactions
  });
});

// Withdrawal
app.post('/api/withdraw', (req, res) => {
  const { vendorId, amount, method, phone } = req.body;
  const amountNum = Number(amount);
  
  const settings = db.prepare('SELECT * FROM settings LIMIT 1').get() as any;
  const feeType = settings?.withdrawalFeeType || 'fixed';
  const feeValue = Number(settings?.withdrawalFeeValue) || 0;
  
  let fee = 0;
  if (feeType === 'fixed') {
    fee = feeValue;
  } else {
    fee = (amountNum * feeValue) / 100;
  }
  
  const netAmount = amountNum - fee;
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(vendorId) as any;
  
  if (!user || user.walletBalance < amountNum) {
    return res.status(400).json({ error: 'Insufficient balance' });
  }

  const id = uuidv4();
  db.prepare('INSERT INTO withdrawals (id, vendorId, vendorName, amount, fee, netAmount, method, phoneNumber, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .run(id, vendorId, user.name, amountNum, fee, netAmount, method, phone, 'Pending');
  
  db.prepare('INSERT INTO wallet_transactions (id, userId, userName, type, amount, status, description, withdrawalId) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .run(uuidv4(), vendorId, user.name, 'withdrawal', -amountNum, 'Pending', `Withdrawal to ${method} (${phone})`, id);
  
  db.prepare('UPDATE users SET walletBalance = walletBalance - ? WHERE id = ?').run(amountNum, vendorId);
  
  broadcast('kuku_withdrawals', db.prepare('SELECT * FROM withdrawals ORDER BY createdAt DESC').all());
  broadcast('kuku_wallet', db.prepare('SELECT * FROM wallet_transactions ORDER BY createdAt DESC').all());
  
  res.json({ id, status: 'Pending' });
});

// Auctions
app.post('/api/auctions', (req, res) => {
  try {
    const { vendorId, vendorName, productName, description, startingPrice, minIncrement, durationHours, location, image } = req.body;
    const id = uuidv4();
    const endTime = new Date();
    endTime.setHours(endTime.getHours() + Number(durationHours || 24));

    db.prepare(`INSERT INTO auctions (id, vendorId, vendorName, productName, description, startingPrice, minIncrement, currentBid, endTime, location, image, status) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(id, vendorId, vendorName, productName, description, startingPrice, minIncrement, startingPrice, endTime.toISOString(), location, image, 'active');
    
    broadcast('kuku_auctions', db.prepare('SELECT * FROM auctions ORDER BY createdAt DESC').all());
    res.json({ id });
  } catch (error: any) {
    console.error('Error creating auction:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/auctions/:id/bid', (req, res) => {
  try {
    const { id } = req.params;
    const { userId, userName, amount } = req.body;
    const bidAmount = Number(amount);

    const auction = db.prepare('SELECT * FROM auctions WHERE id = ?').get(id) as any;
    if (!auction || auction.status !== 'active') return res.status(400).json({ error: 'Auction not active' });
    if (bidAmount < auction.currentBid + auction.minIncrement) return res.status(400).json({ error: 'Bid too low' });

    db.prepare('UPDATE auctions SET currentBid = ?, highestBidderId = ?, highestBidderName = ? WHERE id = ?')
      .run(bidAmount, userId, userName, id);
    
    db.prepare('INSERT INTO bids (id, auctionId, userId, userName, amount) VALUES (?, ?, ?, ?, ?)')
      .run(uuidv4(), id, userId, userName, bidAmount);
    
    broadcast('kuku_auctions', db.prepare('SELECT * FROM auctions ORDER BY createdAt DESC').all());
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error placing bid:', error);
    res.status(500).json({ error: error.message });
  }
});

// ImageKit Auth
app.get('/api/imagekit/auth', (req, res) => {
  try {
    const publicKey = process.env.VITE_IMAGEKIT_PUBLIC_KEY;
    const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
    const urlEndpoint = process.env.VITE_IMAGEKIT_URL_ENDPOINT;

    if (!publicKey || !privateKey) {
      return res.status(503).json({ error: 'ImageKit not configured' });
    }

    const ik = new ImageKit({ publicKey, privateKey, urlEndpoint: urlEndpoint || '' });
    res.json(ik.getAuthenticationParameters());
  } catch (error: any) {
    console.error('Error in ImageKit auth:', error);
    res.status(500).json({ error: error.message });
  }
});

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Vite middleware for development
async function startVite() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }
}

startVite();

