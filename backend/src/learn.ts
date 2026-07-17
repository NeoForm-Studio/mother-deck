/**
 * LEARN layer backend routes — the MOTHER deck's tutor + guided-demo planner.
 *   POST /learn/tutor      — streams an explanation (SSE). Claude via the local
 *                            /api/chat gateway path, or local Qwen via Ollama.
 *   POST /learn/demo-plan  — returns a validated-by-the-frontend action plan
 *                            (JSON) that the deck's demo registry re-checks.
 * Local only. Read-only teaching; the demo registry lives in the frontend and
 * gate-keeps every action.
 */
import type { Express, Request, Response } from 'express';

const OLLAMA_URL = 'http://127.0.0.1:11434/api/chat';
const QWEN_MODEL = process.env.TUTOR_QWEN_MODEL || 'qwen2.5-coder:7b-32k';

interface Ctx { title?: string; body?: string; module?: string | null }

function buildTutorPrompt(context: Ctx, question: string): string {
  const c = context || {};
  const topic = [c.module ? '[' + c.module + ']' : '', c.title || ''].filter(Boolean).join(' ');
  return (
    "You are MOTHER's tutor — a concise, accurate cybersecurity teaching assistant embedded in a " +
    "security-training interface (offensive + defensive, for coursework and CTFs). Explain plainly and " +
    "practically, a few short paragraphs at most. Teach the concept; don't hand out operational steps for " +
    "attacking systems the learner doesn't own.\n\n" +
    "The trainee is looking at this part of the interface:\n" +
    topic + "\n" + (c.body || '') + "\n\n" +
    "Trainee's request: " + (question || 'Explain this in more detail.')
  );
}

function buildDemoPrompt(vocabulary: unknown, context: Ctx, question: string): string {
  const c = context || {};
  return (
    "You are MOTHER's demo planner. Produce a SHORT step-by-step plan that DEMONSTRATES the answer by driving " +
    "a training UI. Output ONLY a JSON array of steps — no prose, no markdown.\n\n" +
    "You may ONLY use these actions and ONLY these module ids and selectors:\n" +
    JSON.stringify(vocabulary, null, 2) + "\n\n" +
    "Rules: 8 steps max. Start with a 'say' that sets up what you'll show. Use 'open' before touching a module. " +
    "Add 'say' narration between actions to teach. Only 'fill' the listed inputs with realistic sample values " +
    "(e.g. TARGET 10.10.10.15, LHOST your-ip, LPORT 4444). Prefer 'sample' to load demo data where available. " +
    "Never invent actions, modules, or selectors not listed. Non-destructive only.\n\n" +
    "Context the trainee is looking at: " + [c.module ? '[' + c.module + ']' : '', c.title || ''].join(' ') + " — " + (c.body || '') + "\n" +
    "Trainee's request: " + (question || 'Show me how this works.') + "\n\nJSON array:"
  );
}

async function streamUpstream(url: string, body: unknown, extract: (line: string) => string | null, send: (o: unknown) => void): Promise<void> {
  const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(55000) });
  if (!r.ok || !r.body) { send({ error: 'upstream ' + r.status }); return; }
  const reader = r.body.getReader();
  const dec = new TextDecoder();
  let buf = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const lines = buf.split('\n');
    buf = lines.pop() ?? '';
    for (const line of lines) { const d = extract(line); if (d) send({ d }); }
  }
}

const claudeExtract = (line: string): string | null => {
  const t = line.trim();
  if (!t.startsWith('data:')) return null;
  const p = t.slice(5).trim();
  if (p === '[DONE]') return null;
  try { const j = JSON.parse(p) as { type?: string; content?: string }; return j.type === 'delta' ? (j.content ?? null) : null; } catch { return null; }
};
const qwenExtract = (line: string): string | null => {
  const t = line.trim();
  if (!t) return null;
  try { const j = JSON.parse(t) as { message?: { content?: string } }; return j.message?.content ?? null; } catch { return null; }
};

async function collectSelfChat(selfChatUrl: string, prompt: string): Promise<string> {
  let out = '';
  await streamUpstream(selfChatUrl, { message: prompt, sessionKey: 'mother:demo' }, claudeExtract, (o) => {
    const d = (o as { d?: string }).d;
    if (d) out += d;
  });
  return out;
}

function extractJsonArray(text: string): unknown[] | null {
  const fenced = text.replace(/```(?:json)?/gi, '');
  const s = fenced.indexOf('[');
  const e = fenced.lastIndexOf(']');
  if (s === -1 || e === -1 || e < s) return null;
  try { return JSON.parse(fenced.slice(s, e + 1)) as unknown[]; } catch { return null; }
}

export function registerLearnRoutes(app: Express, selfChatUrl: string): void {
  app.post('/learn/tutor', async (req: Request, res: Response) => {
    const { model, question, context } = req.body as { model?: string; question?: string; context?: Ctx };
    const prompt = buildTutorPrompt(context ?? {}, question ?? '');
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    const send = (obj: unknown) => res.write('data: ' + JSON.stringify(obj) + '\n\n');
    try {
      if (model === 'qwen') {
        await streamUpstream(OLLAMA_URL, { model: QWEN_MODEL, stream: true, messages: [{ role: 'user', content: prompt }] }, qwenExtract, send);
      } else {
        await streamUpstream(selfChatUrl, { message: prompt, sessionKey: 'mother:tutor' }, claudeExtract, send);
      }
    } catch (e: unknown) {
      send({ error: String(e instanceof Error ? e.message : e) });
    }
    res.write('data: [DONE]\n\n');
    res.end();
  });

  app.post('/learn/demo-plan', async (req: Request, res: Response) => {
    const { question, context, vocabulary } = req.body as { question?: string; context?: Ctx; vocabulary?: unknown };
    const prompt = buildDemoPrompt(vocabulary, context ?? {}, question ?? '');
    try {
      const raw = await collectSelfChat(selfChatUrl, prompt);
      const plan = extractJsonArray(raw);
      if (!plan) { res.json({ ok: false, error: 'planner returned no valid JSON', raw: raw.slice(0, 500) }); return; }
      res.json({ ok: true, plan });
    } catch (e: unknown) {
      res.json({ ok: false, error: String(e instanceof Error ? e.message : e) });
    }
  });
}
