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

dotenv.config();

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: process.env.VITE_FIREBASE_PROJECT_ID || 'kuku-market-default'
  });
}
const db = admin.firestore();

const app = express();
app.use(cors());
app.use(express.json());

// ImageKit Auth Endpoint
app.get('/api/imagekit/auth', async (req, res) => {
  try {
    // Try to get config from Firestore first
    const configDoc = await db.collection('kuku_config').doc('settings').get();
    const config = configDoc.exists ? configDoc.data() : null;

    const publicKey = config?.imagekit_public_key || process.env.VITE_IMAGEKIT_PUBLIC_KEY;
    const privateKey = config?.imagekit_private_key || process.env.IMAGEKIT_PRIVATE_KEY;
    const urlEndpoint = config?.imagekit_url_endpoint || process.env.VITE_IMAGEKIT_URL_ENDPOINT;

    if (!publicKey || !privateKey) {
      return res.status(503).json({ error: 'ImageKit not configured' });
    }

    const ik = new ImageKit({
      publicKey,
      privateKey,
      urlEndpoint: urlEndpoint || '',
    });

    const result = ik.getAuthenticationParameters();
    res.send(result);
  } catch (err) {
    console.error('ImageKit Auth Error:', err);
    res.status(500).json({ error: 'Failed to get auth parameters' });
  }
});

// API Health Check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    time: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development',
    vercel: !!process.env.VERCEL
  });
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
  
  const PORT = 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

export default app;
