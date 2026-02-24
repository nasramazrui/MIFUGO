import express from 'express';
import { createServer as createViteServer } from 'vite';
import ImageKit from 'imagekit';
import dotenv from 'dotenv';
import cors from 'cors';

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

// Initialize ImageKit only if keys are provided
let ik: ImageKit | null = null;
try {
  if (process.env.VITE_IMAGEKIT_PUBLIC_KEY && process.env.IMAGEKIT_PRIVATE_KEY) {
    ik = new ImageKit({
      publicKey: process.env.VITE_IMAGEKIT_PUBLIC_KEY,
      privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
      urlEndpoint: process.env.VITE_IMAGEKIT_URL_ENDPOINT || '',
    });
    console.log('ImageKit initialized successfully');
  } else {
    console.warn('ImageKit keys missing, image upload features will be limited');
  }
} catch (err) {
  console.error('Failed to initialize ImageKit:', err);
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // ImageKit Auth Endpoint
  app.get('/api/imagekit/auth', (req, res) => {
    if (!ik) {
      return res.status(503).json({ error: 'ImageKit not configured' });
    }
    try {
      const result = ik.getAuthenticationParameters();
      res.send(result);
    } catch (err) {
      res.status(500).json({ error: 'Failed to get auth parameters' });
    }
  });

  // API Health Check
  app.get('/api/health', (req, res) => {
    res.json({ 
      status: 'ok', 
      time: new Date().toISOString(),
      env: process.env.NODE_ENV || 'development'
    });
  });

  // Vite middleware for development
  const isProd = process.env.NODE_ENV === 'production';
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

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
});
