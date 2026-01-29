// Vercel serverless: POST /api/generate (generate or edit)
import {
  createFlowchartFromPromptWithSource,
  editFlowchartFromSource,
} from '../dist/index.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = req.body?.apiKey && typeof req.body.apiKey === 'string' ? req.body.apiKey.trim() : null;
  if (!apiKey) {
    return res.status(400).json({ error: 'API key required. Enter your xAI API key (get one at console.x.ai).' });
  }

  const previousContent = req.body?.previousContent;
  const format = req.body?.format;
  const editInstruction = req.body?.editInstruction;

  if (
    previousContent != null &&
    typeof previousContent === 'string' &&
    format != null &&
    (format === 'dsl' || format === 'json' || format === 'dot') &&
    editInstruction != null &&
    typeof editInstruction === 'string' &&
    editInstruction.trim()
  ) {
    try {
      const result = await editFlowchartFromSource(
        previousContent.trim(),
        format,
        editInstruction.trim(),
        { apiKey }
      );
      return res.status(200).json({
        excalidraw: result.excalidraw,
        sourceContent: result.sourceContent,
        format: result.format,
      });
    } catch (err) {
      return res.status(500).json({ error: err.message || 'Edit failed' });
    }
  }

  const prompt = req.body?.prompt;
  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid prompt' });
  }

  try {
    const result = await createFlowchartFromPromptWithSource(prompt.trim(), { apiKey });
    return res.status(200).json({
      excalidraw: result.excalidraw,
      sourceContent: result.sourceContent,
      format: result.format,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Generation failed' });
  }
}
