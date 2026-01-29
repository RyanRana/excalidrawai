// Vercel serverless: POST /api/generate (prompt + apiKey -> excalidraw)
import { createFlowchartFromPrompt } from '../dist/index.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

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
    return res.status(200).json({ excalidraw });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Generation failed' });
  }
}
