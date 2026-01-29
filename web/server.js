/**
 * Web server: static frontend + POST /api/generate.
 * Production: no .env key. API key must be sent in request body from the client.
 * Run from project root: npm run build && npm run web
 */

import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createFlowchartFromPrompt } from '../dist/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(express.static(join(__dirname)));

app.post('/api/generate', async (req, res) => {
  const prompt = req.body?.prompt;
  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid prompt' });
  }
  const apiKey = req.body?.apiKey && typeof req.body.apiKey === 'string' ? req.body.apiKey.trim() : null;
  if (!apiKey) {
    return res.status(400).json({ error: 'API key required. Enter your xAI API key (get one at console.x.ai).' });
  }
  try {
    const excalidraw = await createFlowchartFromPrompt(prompt.trim(), { apiKey });
    res.json({ excalidraw });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Generation failed' });
  }
});

function start(port) {
  const server = app.listen(port, () => {
    console.log(`http://localhost:${port}`);
  });
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE' && port < 3010) {
      start(port + 1);
    } else {
      throw err;
    }
  });
}

const port = parseInt(process.env.PORT, 10) || 3000;
start(port);
