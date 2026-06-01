// Tiny durable capture endpoint for LOCAL verification of the waitlist flow.
// It documents the contract a managed backend (Formspree/Supabase) must satisfy:
//   POST JSON { email, source, submittedAt } -> 2xx, append-only durable store.
// Run:  node scripts/dev-waitlist-endpoint.mjs   (listens on :4000)
// Point the app at it:  NEXT_PUBLIC_WAITLIST_ENDPOINT=http://localhost:4000 npm run dev
// Submissions land in data/waitlist.jsonl (deduped by email).
import { createServer } from 'node:http';
import { appendFile, mkdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const STORE = join(ROOT, 'data', 'waitlist.jsonl');
const PORT = process.env.PORT || 4000;

async function known(email) {
  try {
    const txt = await readFile(STORE, 'utf8');
    return txt
      .split('\n')
      .filter(Boolean)
      .some((l) => JSON.parse(l).email === email);
  } catch {
    return false;
  }
}

const server = createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.writeHead(204).end();
  if (req.method !== 'POST') return res.writeHead(405).end();

  let body = '';
  req.on('data', (c) => (body += c));
  req.on('end', async () => {
    try {
      const parsed = JSON.parse(body || '{}');
      const email = String(parsed.email || '').trim().toLowerCase();
      if (!email || !email.includes('@')) {
        return res.writeHead(400).end(JSON.stringify({ error: 'invalid email' }));
      }
      await mkdir(dirname(STORE), { recursive: true });
      if (!(await known(email))) {
        await appendFile(
          STORE,
          JSON.stringify({
            email,
            source: parsed.source || 'unknown',
            submittedAt: parsed.submittedAt,
          }) + '\n',
        );
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
    } catch {
      res.writeHead(400).end(JSON.stringify({ error: 'bad request' }));
    }
  });
});

server.listen(PORT, () => console.log(`waitlist dev endpoint on :${PORT} -> ${STORE}`));
