import express from 'express';
import { createServer as createViteServer } from 'vite';
import ImageKit from 'imagekit';
import dotenv from 'dotenv';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import admin from 'firebase-admin';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Process-level error handlers
process.on('uncaughtException', (err) => {
  console.error('[CRASH] Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[CRASH] Unhandled Rejection at:', promise, 'reason:', reason);
});

dotenv.config();

// Initialize Firebase Admin
let db: admin.firestore.Firestore;

try {
  if (!admin.apps.length) {
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
    let projectId = process.env.VITE_FIREBASE_PROJECT_ID || 'fleet-a4a43';
    
    if (serviceAccount) {
      console.log("[Firebase] Found FIREBASE_SERVICE_ACCOUNT, length:", serviceAccount.length);
      try {
        const cert = JSON.parse(serviceAccount);
        projectId = cert.project_id || projectId;
        
        console.log(`[Firebase] Initializing with Service Account for project: ${projectId}`);
        admin.initializeApp({
          credential: admin.credential.cert(cert),
          projectId
        });
      } catch (parseErr: any) {
        console.error('[Firebase] JSON Parse Error for Service Account:', parseErr.message);
        console.log('[Firebase] Attempting default initialization as fallback...');
        admin.initializeApp({ projectId });
      }
    } else {
      console.log("[Firebase] No FIREBASE_SERVICE_ACCOUNT found, using default initialization...");
      admin.initializeApp({ projectId });
    }
  }
  
  db = admin.firestore();
  db.settings({ ignoreUndefinedProperties: true });
  console.log(`[Firebase] Admin initialized. Project: ${admin.app().options.projectId}`);
} catch (err: any) {
  console.error('[Firebase] Fatal Initialization Error:', err.message);
  // We still need to define db to avoid crashes later, even if it's broken
  // @ts-ignore
  db = {
    collection: () => ({
      doc: () => ({
        get: () => Promise.reject(new Error('Firebase not initialized: ' + err.message)),
        set: () => Promise.reject(new Error('Firebase not initialized: ' + err.message)),
        update: () => Promise.reject(new Error('Firebase not initialized: ' + err.message)),
      }),
      where: () => ({
        get: () => Promise.reject(new Error('Firebase not initialized: ' + err.message)),
      }),
      listCollections: () => Promise.reject(new Error('Firebase not initialized: ' + err.message)),
    })
  } as any;
}

const app = express();
app.use(cors());
app.use(express.json());

// --- Wallet & Withdrawal API ---

// Get Wallet Balance & Transactions
app.get('/api/wallet/:vendorId', async (req, res) => {
  const { vendorId } = req.params;
  console.log(`[Wallet] Fetching data for vendor: ${vendorId}`);
  
  try {
    if (!db || typeof db.collection !== 'function') {
      console.error('[Wallet] Database not properly initialized!');
      return res.status(500).json({ error: 'Database not initialized' });
    }

    if (!vendorId || vendorId === 'undefined') {
      return res.status(400).json({ error: 'Invalid vendor ID' });
    }

    // Get balance
    const walletDoc = await db.collection('kuku_users').doc(vendorId).get();
    let walletData = walletDoc.exists ? walletDoc.data() : null;
    
    if (!walletDoc.exists) {
      console.log(`[Wallet] User doc not found for: ${vendorId}`);
      // Return 0 balance instead of initializing with demo data to avoid confusion
      walletData = { 
        walletBalance: 0, 
        shopName: 'Mtumiaji Mpya', 
        role: 'user'
      };
    }

    // Get transactions
    const transactionsSnapshot = await db.collection('kuku_wallet')
      .where('userId', '==', vendorId)
      .get();
    
    let transactions = transactionsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        // Ensure createdAt is serializable
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : (data.createdAt || data.date || new Date().toISOString())
      };
    });

    // Sort and limit
    transactions.sort((a: any, b: any) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return dateB - dateA;
    });
    transactions = transactions.slice(0, 50);

    res.json({
      balance: walletData?.walletBalance || 0,
      vendorName: walletData?.shopName || walletData?.name || 'Mtumiaji',
      transactions
    });
  } catch (err: any) {
    console.error('[Wallet] Error:', err);
    res.status(500).json({ 
      error: 'Failed to fetch wallet data', 
      details: err.message,
      code: err.code 
    });
  }
});

// Create Withdrawal Request
app.post('/api/withdraw', async (req, res) => {
  try {
    const { vendorId, amount, method, phone } = req.body;
    
    if (!vendorId || !amount || !method || !phone) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const amountNum = Number(amount);
    
    // Fetch settings for fee
    const settingsDoc = await db.collection('kuku_config').doc('settings').get();
    const settings = settingsDoc.data() || {};
    const feeType = settings.withdrawalFeeType || 'fixed';
    const feeValue = Number(settings.withdrawalFeeValue) || 0;
    
    let fee = 0;
    if (feeType === 'fixed') {
      fee = feeValue;
    } else {
      fee = (amountNum * feeValue) / 100;
    }
    
    const netAmount = amountNum - fee;

    // Check balance
    const walletDoc = await db.collection('kuku_users').doc(vendorId).get();
    if (!walletDoc.exists || (walletDoc.data()?.walletBalance || 0) < amountNum) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    const vendorName = walletDoc.data()?.shopName || walletDoc.data()?.name || 'Vendor';

    // Create request
    const withdrawRef = await db.collection('kuku_withdrawals').add({
      vendorId,
      vendorName,
      amount: amountNum,
      fee,
      netAmount,
      method,
      phoneNumber: phone,
      status: 'Pending',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Create transaction record in kuku_wallet
    await db.collection('kuku_wallet').add({
      userId: vendorId,
      userName: vendorName,
      type: 'withdrawal',
      amount: -amountNum,
      status: 'Pending',
      description: `Withdrawal to ${method} (${phone})`,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      withdrawalId: withdrawRef.id
    });

    // Deduct balance immediately
    await db.collection('kuku_users').doc(vendorId).update({
      walletBalance: admin.firestore.FieldValue.increment(-amountNum)
    });

    res.json({ id: withdrawRef.id, status: 'Pending' });
  } catch (err: any) {
    console.error('Withdraw Error Details:', {
      message: err.message,
      code: err.code,
      details: err.details,
      vendorId: req.body.vendorId
    });
    res.status(500).json({ error: 'Failed to process withdrawal', details: err.message });
  }
});

// Admin: Get all withdrawal requests
app.get('/api/admin/withdrawals', async (req, res) => {
  try {
    const snapshot = await db.collection('kuku_withdrawals')
      .orderBy('createdAt', 'desc')
      .get();
    
    const withdrawals = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.json(withdrawals);
  } catch (err: any) {
    console.error('Admin Withdrawals Error Details:', {
      message: err.message,
      code: err.code,
      details: err.details
    });
    res.status(500).json({ error: 'Failed to fetch withdrawals', details: err.message });
  }
});

// Admin: Approve/Reject Withdrawal
app.post('/api/admin/withdrawals/:id/update', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'Completed' or 'Rejected'

    if (!['Completed', 'Rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const withdrawDoc = await db.collection('kuku_withdrawals').doc(id).get();
    if (!withdrawDoc.exists) {
      return res.status(404).json({ error: 'Request not found' });
    }

    const data = withdrawDoc.data();
    if (data?.status !== 'Pending') {
      return res.status(400).json({ error: 'Request already processed' });
    }

    // Update status
    await db.collection('kuku_withdrawals').doc(id).update({
      status,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Update transaction status in kuku_wallet
    const transSnapshot = await db.collection('kuku_wallet')
      .where('withdrawalId', '==', id)
      .limit(1)
      .get();
    
    if (!transSnapshot.empty) {
      await transSnapshot.docs[0].ref.update({ status });
    }

    // If rejected, refund balance
    if (status === 'Rejected') {
      await db.collection('kuku_users').doc(data.vendorId).update({
        walletBalance: admin.firestore.FieldValue.increment(data.amount)
      });
    }

    res.json({ success: true, status });
  } catch (err: any) {
    console.error('Update Withdrawal Error Details:', {
      message: err.message,
      code: err.code,
      details: err.details,
      id: req.params.id
    });
    res.status(500).json({ error: 'Failed to update withdrawal', details: err.message });
  }
});

// --- Existing Endpoints ---

// ImageKit Auth Endpoint
app.get('/api/imagekit/auth', async (req, res) => {
  try {
    let publicKey = process.env.VITE_IMAGEKIT_PUBLIC_KEY;
    let privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
    let urlEndpoint = process.env.VITE_IMAGEKIT_URL_ENDPOINT;

    // Try to get from Firestore if env vars are missing
    if (!publicKey || !privateKey) {
      try {
        const configDoc = await db.collection('kuku_config').doc('settings').get().catch(() => null);
        if (configDoc && configDoc.exists) {
          const config = configDoc.data();
          publicKey = publicKey || config?.imagekit_public_key;
          privateKey = privateKey || config?.imagekit_private_key;
          urlEndpoint = urlEndpoint || config?.imagekit_url_endpoint;
        }
      } catch (dbErr) {
        console.warn('Firestore config fetch failed, using env vars only');
      }
    }

    if (!publicKey || !privateKey) {
      console.error('ImageKit Configuration Missing:', { publicKey: !!publicKey, privateKey: !!privateKey });
      return res.status(503).json({ 
        error: 'ImageKit not configured. Please add IMAGEKIT_PRIVATE_KEY and VITE_IMAGEKIT_PUBLIC_KEY to your Secrets.' 
      });
    }

    const ik = new ImageKit({
      publicKey,
      privateKey,
      urlEndpoint: urlEndpoint || '',
    });

    const result = ik.getAuthenticationParameters();
    res.send(result);
  } catch (err: any) {
    console.error('ImageKit Auth Error:', err);
    res.status(500).json({ 
      error: `Failed to get ImageKit auth parameters: ${err.message}`,
      details: err.stack
    });
  }
});

// API Health Check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    time: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development',
    vercel: !!process.env.VERCEL,
    firebase: admin.apps.length > 0
  });
});

app.get("/api/test-firebase", async (req, res) => {
  try {
    const collections = await db.listCollections();
    res.json({ 
      status: "connected", 
      collections: collections.map(c => c.id),
      projectId: admin.app().options.projectId
    });
  } catch (err: any) {
    res.status(500).json({ 
      status: "error", 
      message: err.message, 
      code: err.code,
      projectId: admin.app().options.projectId
    });
  }
});

async function setupVite() {
  const isProd = process.env.NODE_ENV === 'production' || !!process.env.VERCEL;
  const distExists = fs.existsSync(path.join(__dirname, 'dist'));
  
  if (!isProd || !distExists) {
    console.log('Initializing Vite middleware...');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    console.log('Serving static files from dist...');
    app.use(express.static('dist'));
    app.get('*', (req, res) => {
      res.sendFile('dist/index.html', { root: '.' });
    });
  }
}

// Only setup Vite if we are not on Vercel (Vercel handles static files separately)
if (!process.env.VERCEL) {
  setupVite().catch(err => console.error('Vite setup failed:', err));
}

// --- AUCTION SYSTEM ---

// Create Auction
app.post('/api/auctions', async (req, res) => {
  try {
    const { 
      vendorId, vendorName, productName, description, 
      startingPrice, minIncrement, durationHours, 
      location, image
    } = req.body;
    
    if (!vendorId || !productName || !startingPrice) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const endTime = new Date();
    endTime.setHours(endTime.getHours() + Number(durationHours || 24));

    const auctionRef = await db.collection('kuku_auctions').add({
      vendorId,
      vendorName,
      productName,
      description,
      startingPrice: Number(startingPrice),
      minIncrement: Number(minIncrement || 0),
      currentBid: Number(startingPrice),
      endTime: admin.firestore.Timestamp.fromDate(endTime),
      location,
      image,
      status: 'active',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    res.json({ id: auctionRef.id });
  } catch (error: any) {
    console.error('Create Auction Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Place Bid
app.post('/api/auctions/:id/bid', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, userName, amount } = req.body;
    const bidAmount = Number(amount);

    const auctionRef = db.collection('kuku_auctions').doc(id);
    const auctionDoc = await auctionRef.get();

    if (!auctionDoc.exists) return res.status(404).json({ error: 'Auction not found' });
    const auction = auctionDoc.data();

    if (auction?.status !== 'active') return res.status(400).json({ error: 'Auction ended' });
    if (bidAmount < (auction?.currentBid || 0) + (auction?.minIncrement || 0)) {
      return res.status(400).json({ error: 'Bid too low' });
    }

    // Update auction
    await auctionRef.update({
      currentBid: bidAmount,
      highestBidderId: userId,
      highestBidderName: userName
    });

    // Record bid
    await db.collection('kuku_bids').add({
      auctionId: id,
      userId,
      userName,
      amount: bidAmount,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Finalize Auction (Winner Selection)
app.post('/api/auctions/:id/finalize', async (req, res) => {
  try {
    const { id } = req.params;
    const auctionRef = db.collection('kuku_auctions').doc(id);
    const auctionDoc = await auctionRef.get();

    if (!auctionDoc.exists) return res.status(404).json({ error: 'Auction not found' });
    const auction = auctionDoc.data();

    if (auction?.status === 'ended') return res.json({ success: true, alreadyEnded: true });

    await auctionRef.update({
      status: 'ended',
      winnerId: auction?.highestBidderId || null,
      winnerName: auction?.highestBidderName || null,
      paymentStatus: 'pending'
    });

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Confirm Auction Payment
app.post('/api/auctions/:id/pay', async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentMethod, transactionId, senderPhone, senderName } = req.body;

    const auctionRef = db.collection('kuku_auctions').doc(id);
    await auctionRef.update({
      paymentStatus: 'paid',
      paymentMethod,
      transactionId,
      senderPhone,
      senderName
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error('Pay Auction Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Global Error Handler
app.use((err: any, req: any, res: any, next: any) => {
  console.error('Global Server Error:', err);
  if (res.headersSent) {
    return next(err);
  }
  res.status(500).json({ 
    error: 'Internal Server Error', 
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

const PORT = 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});

export default app;
