// xAI Grok: turn a natural-language prompt into flowchart DSL / JSON / DOT.
// Needs XAI_API_KEY in env (or pass apiKey in options).

function xaiBase(): string {
  const base = process.env.XAI_BASE_URL ?? 'https://api.x.ai';
  return base.replace(/\/$/, '') + '/v1';
}

const DEFAULT_MODEL = 'grok-3-latest';

const SYSTEM_PROMPT = `You are a flowchart generator. Convert the user's description into a flowchart definition.

Output ONLY valid flowchart syntax—no explanation, no markdown code fences, no extra text.

Prefer DSL format when possible. DSL syntax:
- [Label] = rectangle (process step)
- {Label} = diamond (decision)
- (Label) = ellipse (start/end)
- [[Label]] = database
- A -> B = arrow from A to B
- A -> "label" -> B = labeled arrow
- A --> B = dashed arrow
- Use @direction TB|BT|LR|RL and @spacing N for layout

Example DSL: (Start) -> [Process] -> {Decision?} -> "yes" -> [Next] -> (End)

If the user asks for JSON or DOT explicitly, output that format instead.

JSON format: {"nodes":[{"id":"...","type":"rectangle"|"diamond"|"ellipse"|"database","label":"..."}],"edges":[{"from":"id","to":"id","label":"..."}]}
DOT format: digraph G { node [shape=box]; "A" -> "B"; }

Output nothing but the flowchart definition.`;

export type PromptOutputFormat = 'dsl' | 'json' | 'dot';

export interface GrokPromptOptions {
  apiKey?: string;
  model?: string;
  preferredFormat?: PromptOutputFormat;
}

export function detectOutputFormat(raw: string): PromptOutputFormat {
  const s = raw.trim();
  if (s.startsWith('{') && s.includes('"nodes"') && s.includes('"edges"')) return 'json';
  if (s.includes('digraph') || (s.includes('graph') && s.includes('->') && s.includes(';'))) return 'dot';
  return 'dsl';
}

export function stripMarkdownCodeBlock(raw: string): string {
  let s = raw.trim();
  const m = s.match(/^```(?:dsl|json|dot|flowchart)?\s*\n?([\s\S]*?)\n?```$/);
  if (m) s = m[1].trim();
  return s;
}

function formatHint(fmt: PromptOutputFormat | undefined): string {
  if (fmt === 'json') return ' Output valid JSON only.';
  if (fmt === 'dot') return ' Output valid DOT (Graphviz) only.';
  return ' Prefer DSL format.';
}

function pullContentFromResponse(data: Record<string, unknown>): string | undefined {
  // Chat completions (OpenAI-style) – try this first since we call it first
  const choices = data.choices as Array<{ message?: { content?: string } }> | undefined;
  if (Array.isArray(choices) && choices[0]?.message?.content) return choices[0].message.content;

  if (typeof (data as { content?: string }).content === 'string') return (data as { content: string }).content;

  // Responses API: output[] with text
  const output = data.output as Array<{ type?: string; text?: string; content?: string }> | undefined;
  if (Array.isArray(output)) {
    const part = output.find((o) => o.type === 'output_text' || o.text != null || o.content != null);
    if (part?.text) return part.text;
    if (part?.content) return part.content;
    const bits = output.map((o) => o.text ?? o.content).filter(Boolean) as string[];
    if (bits.length) return bits.join('\n');
  }
  return undefined;
}

async function callGrok(
  url: string,
  body: Record<string, unknown>,
  headers: Record<string, string>
): Promise<Response> {
  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
  if (res.status === 404) {
    const base = xaiBase();
    const fallback = base + '/responses';
    if (url.endsWith('/chat/completions')) {
      const fallbackBody = {
        model: body.model,
        store: false,
        input: (body.messages as Array<{ role: string; content: string }>).map((m) => ({
          role: m.role === 'system' ? 'developer' : m.role,
          content: m.content,
        })),
      };
      return fetch(fallback, { method: 'POST', headers, body: JSON.stringify(fallbackBody) });
    }
  }
  return res;
}

export async function promptToFlowchartDefinition(
  userPrompt: string,
  options: GrokPromptOptions = {}
): Promise<{ content: string; format: PromptOutputFormat }> {
  const apiKey = (options.apiKey ?? process.env.XAI_API_KEY)?.trim();
  if (!apiKey) throw new Error('xAI API key is required. Set XAI_API_KEY or pass apiKey in options.');

  const model = options.model ?? process.env.XAI_MODEL ?? DEFAULT_MODEL;
  const hint = formatHint(options.preferredFormat);
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT + hint },
    { role: 'user', content: userPrompt },
  ];
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` };
  const base = xaiBase();
  const chatUrl = base + '/chat/completions';
  const chatBody = { model, messages, max_tokens: 2048, temperature: 0.2, stream: false };

  let response = await callGrok(chatUrl, chatBody, headers);

  if (!response.ok) {
    const errBody = await response.text();
    let msg = `xAI API error ${response.status}: ${response.statusText}`;
    try {
      const parsed = JSON.parse(errBody);
      if (parsed.error?.message) msg = parsed.error.message;
    } catch {
      if (errBody) msg += ` — ${errBody.slice(0, 200)}`;
    }
    if (response.status === 404) msg += ' Ensure your API key has access to the Responses endpoint at console.x.ai.';
    throw new Error(msg);
  }

  const data = (await response.json()) as Record<string, unknown>;
  const content = pullContentFromResponse(data)?.trim();
  if (!content) throw new Error('xAI API returned no content.');

  const stripped = stripMarkdownCodeBlock(content);
  const format = detectOutputFormat(stripped);
  return { content: stripped, format };
}

const EDIT_SYSTEM_PROMPT = `You are a flowchart editor. The user will provide:
1. An existing flowchart definition (DSL, JSON, or DOT).
2. An edit instruction (e.g. "add a step after X", "rename A to B", "remove the decision node").

Output ONLY the complete updated flowchart in the SAME format as the input. No explanation, no markdown fences, no extra text.
Preserve the format: if input is DSL, output DSL; if JSON, output JSON; if DOT, output DOT.`;

export async function editFlowchartDefinition(
  previousContent: string,
  editInstruction: string,
  options: GrokPromptOptions = {}
): Promise<{ content: string; format: PromptOutputFormat }> {
  const apiKey = (options.apiKey ?? process.env.XAI_API_KEY)?.trim();
  if (!apiKey) throw new Error('xAI API key is required. Set XAI_API_KEY or pass apiKey in options.');

  const format = options.preferredFormat ?? detectOutputFormat(previousContent.trim());
  const hint = formatHint(format);
  const userContent = `Current flowchart (${format.toUpperCase()}):\n\n${previousContent}\n\nEdit instruction: ${editInstruction}`;
  const messages = [
    { role: 'system', content: EDIT_SYSTEM_PROMPT + hint },
    { role: 'user', content: userContent },
  ];
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` };
  const base = xaiBase();
  const chatUrl = base + '/chat/completions';
  const model = options.model ?? process.env.XAI_MODEL ?? DEFAULT_MODEL;
  const chatBody = { model, messages, max_tokens: 2048, temperature: 0.2, stream: false };

  const response = await callGrok(chatUrl, chatBody, headers);

  if (!response.ok) {
    const errBody = await response.text();
    let msg = `xAI API error ${response.status}: ${response.statusText}`;
    try {
      const parsed = JSON.parse(errBody);
      if (parsed.error?.message) msg = parsed.error.message;
    } catch {
      if (errBody) msg += ` — ${errBody.slice(0, 200)}`;
    }
    throw new Error(msg);
  }

  const data = (await response.json()) as Record<string, unknown>;
  const content = pullContentFromResponse(data)?.trim();
  if (!content) throw new Error('xAI API returned no content.');

  const stripped = stripMarkdownCodeBlock(content);
  const detectedFormat = detectOutputFormat(stripped);
  return { content: stripped, format: detectedFormat };
}
