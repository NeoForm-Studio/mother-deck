import { Router } from 'express';
import { execFile } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

/**
 * PASSIVE RECON (OSINT aggregator) — SYS.13 of the MOTHER deck.
 * ───────────────────────────────────────────────────────────────────────────
 * Orchestrates existing Kali tools (we do NOT scrape sources ourselves):
 *   crt.sh        — certificate-transparency subdomains (public JSON endpoint)
 *   theHarvester  — emails / hosts / subdomains from many engines
 *   subfinder     — passive subdomain enumeration
 *   amass         — passive subdomain + IP enumeration
 *   shodan        — reads Shodan's pre-scanned DB (never touches the target)
 *
 * Each source runs in Kali WSL (which has internet; the isolated VM does not),
 * its STRUCTURED output is parsed into a canonical record, then all records are
 * deduped and correlated into "assets". Results stream back as NDJSON so the UI
 * can show each source reporting in. Everything here is passive/read-only.
 */

const router = Router();

const KALI_DISTRO = process.env.KALI_DISTRO || 'kali-linux';
// Domains only ever reach a shell after this guard — prevents command injection.
const DOMAIN_RE = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/i;

type Kind = 'subdomain' | 'ip' | 'hostname' | 'email' | 'tech' | 'breach';
interface Rec { kind: Kind; value: string; source: string; meta?: Record<string, unknown>; }

// ─── secrets (gitignored backend/.env.local, never committed) ────────────────
function loadEnvLocal(): Record<string, string> {
  const parsed: Record<string, string> = {};
  const candidates = [
    join(process.cwd(), '.env.local'),
    join(dirname(fileURLToPath(import.meta.url)), '..', '..', '.env.local'),
  ];
  for (const p of candidates) {
    if (!existsSync(p)) continue;
    for (const line of readFileSync(p, 'utf8').split('\n')) {
      if (line.trim().startsWith('#')) continue;
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
      if (m) parsed[m[1]] = m[2];
    }
    break;
  }
  return parsed;
}
const shodanKey = () => process.env.SHODAN_API_KEY || loadEnvLocal().SHODAN_API_KEY || '';

// ─── run a command in Kali WSL, tolerant of timeouts (keep partial stdout) ───
// SECURITY:
//  • HISTFILE=/dev/null + HISTSIZE=0 — recon commands (and any secrets in them) are
//    NEVER persisted to ~/.bash_history on the Kali box. No on-disk record of targets.
//  • secretEnv values are forwarded into WSL via WSLENV as ENVIRONMENT, so a secret
//    (e.g. the Shodan key) never appears in the command string Athena builds, nor in
//    ~/.bash_history. Reference it inside `cmd` as $NAME.
function runKali(cmd: string, timeoutMs: number, secretEnv?: Record<string, string>): Promise<{ out: string; timedOut: boolean }> {
  const env: NodeJS.ProcessEnv = { ...process.env };
  if (secretEnv && Object.keys(secretEnv).length) {
    Object.assign(env, secretEnv);
    const fwd = Object.keys(secretEnv).map((k) => `${k}/u`).join(':');
    env.WSLENV = env.WSLENV ? `${fwd}:${env.WSLENV}` : fwd;
  }
  const wrapped = `HISTFILE=/dev/null HISTSIZE=0; ${cmd}`;
  return new Promise((resolve) => {
    execFile(
      'wsl.exe', ['-d', KALI_DISTRO, '-e', 'bash', '-lic', wrapped],
      { timeout: timeoutMs, maxBuffer: 32 * 1024 * 1024, windowsHide: true, env },
      (err, stdout) => {
        resolve({ out: stdout || '', timedOut: !!err });
      },
    );
  });
}

// ─── source wrappers → canonical records ─────────────────────────────────────
async function srcCrtsh(domain: string): Promise<Rec[]> {
  // crt.sh is a documented public JSON endpoint; it is slow/flaky, so long timeout.
  const cmd = `curl -s --max-time 40 "https://crt.sh/?q=%25.${domain}&output=json"`;
  const { out } = await runKali(cmd, 50000);
  const set = new Set<string>();
  try {
    for (const row of JSON.parse(out || '[]')) {
      for (const n of String(row.name_value || '').split(/\n/)) {
        const h = n.trim().replace(/^\*\./, '').toLowerCase();
        if (h && h.endsWith(domain) && !h.includes(' ')) set.add(h);
      }
    }
  } catch { /* crt.sh returned non-JSON / nothing — treat as no results */ }
  return [...set].map((value) => ({ kind: 'subdomain' as Kind, value, source: 'crt.sh' }));
}

async function srcTheHarvester(domain: string): Promise<Rec[]> {
  const engines = 'bing,duckduckgo,otx,hackertarget,rapiddns,anubis,crtsh,threatminer';
  const cmd =
    `f=/tmp/th_$$; theHarvester -d ${domain} -b ${engines} -f "$f" >/dev/null 2>&1; ` +
    `cat "$f.json" 2>/dev/null; rm -f "$f.json" "$f.xml" 2>/dev/null`;
  const { out } = await runKali(cmd, 150000);
  const recs: Rec[] = [];
  try {
    const j = JSON.parse(out || '{}');
    for (const e of j.emails || []) if (e) recs.push({ kind: 'email', value: String(e).toLowerCase(), source: 'theHarvester' });
    for (const h of j.hosts || []) {
      const [host, ip] = String(h).split(':');
      const hn = host.trim().toLowerCase();
      if (hn && hn.endsWith(domain)) recs.push({ kind: 'subdomain', value: hn, source: 'theHarvester', meta: ip ? { ip } : undefined });
      if (ip && /^\d+\.\d+\.\d+\.\d+$/.test(ip.trim())) recs.push({ kind: 'ip', value: ip.trim(), source: 'theHarvester', meta: { host: hn } });
    }
    for (const ip of j.ips || []) if (/^\d+\.\d+\.\d+\.\d+$/.test(String(ip))) recs.push({ kind: 'ip', value: String(ip), source: 'theHarvester' });
  } catch { /* no parseable output */ }
  return recs;
}

async function srcSubfinder(domain: string): Promise<Rec[]> {
  const cmd = `subfinder -d ${domain} -silent -oJ 2>/dev/null`;
  const { out } = await runKali(cmd, 90000);
  const set = new Set<string>();
  for (const line of out.split(/\r?\n/)) {
    const t = line.trim(); if (!t) continue;
    try { const j = JSON.parse(t); if (j.host) set.add(String(j.host).toLowerCase()); }
    catch { if (t.endsWith(domain)) set.add(t.toLowerCase()); }
  }
  return [...set].map((value) => ({ kind: 'subdomain' as Kind, value, source: 'subfinder' }));
}

async function srcAmass(domain: string): Promise<Rec[]> {
  // Passive only — never resolves/contacts the target. Capped tight for the UI.
  const cmd = `amass enum -passive -d ${domain} -timeout 2 2>/dev/null`;
  const { out } = await runKali(cmd, 140000);
  const recs: Rec[] = [];
  const seen = new Set<string>();
  for (const raw of out.split(/\r?\n/)) {
    const line = raw.trim(); if (!line) continue;
    const host = line.split(/\s+/)[0].toLowerCase();
    if (host.endsWith(domain) && !seen.has(host)) { seen.add(host); recs.push({ kind: 'subdomain', value: host, source: 'amass' }); }
  }
  return recs;
}

// Shodan — members-only domain DB (subdomains + A records). On the free "oss"
// tier this 403s ("Requires membership"); we surface that as `locked` so the UI
// can say so instead of a bare 0. Lights up automatically on a paid membership.
async function shodanDomain(domain: string, key: string): Promise<{ recs: Rec[]; locked: boolean }> {
  // SECURITY: the key is forwarded as $SHODAN_API_KEY (WSLENV env), written into a
  // 0600 curl config, and read with `curl -K` — so it never lands in the command
  // string, curl's argv (ps), or bash history. domain is DOMAIN_RE-validated upstream.
  const cmd =
    `cfg="$(mktemp)"; chmod 600 "$cfg"; ` +
    `printf 'url = "https://api.shodan.io/dns/domain/%s?key=%s"\\n' '${domain}' "$SHODAN_API_KEY" > "$cfg"; ` +
    `curl -s --max-time 25 -K "$cfg"; rm -f "$cfg"`;
  const { out } = await runKali(cmd, 35000, { SHODAN_API_KEY: key });
  const recs: Rec[] = [];
  try {
    const j = JSON.parse(out || '{}');
    if (j.error) return { recs, locked: /member/i.test(String(j.error)) };
    for (const sub of j.subdomains || []) {
      const host = sub === '' ? domain : `${sub}.${domain}`;
      recs.push({ kind: 'subdomain', value: host.toLowerCase(), source: 'shodan' });
    }
    for (const d of j.data || []) {
      if (d.type === 'A' && /^\d+\.\d+\.\d+\.\d+$/.test(String(d.value))) {
        const host = d.subdomain ? `${d.subdomain}.${domain}` : domain;
        recs.push({ kind: 'ip', value: String(d.value), source: 'shodan', meta: { host: host.toLowerCase() } });
      }
    }
  } catch { /* invalid response — no results */ }
  return { recs, locked: false };
}

// Local DNS resolution in Kali (getent — glibc, always present, no extra tools,
// no API quota). Passive: it queries DNS, never the target host. This is what
// actually fills the "Resolved IP(s)" column for every discovered subdomain.
async function resolveHostsLocal(hosts: string[]): Promise<Rec[]> {
  const safe = [...new Set(hosts.map((h) => h.toLowerCase()).filter((h) => /^[a-z0-9.-]+$/.test(h)))].slice(0, 500);
  if (!safe.length) return [];
  const cmd =
    `printf '%s\\n' ${safe.join(' ')} | xargs -P 40 -n1 bash -c ` +
    `'for ip in $(getent ahostsv4 "$0" 2>/dev/null | cut -d" " -f1 | sort -u); do echo "$0 $ip"; done' | sort -u`;
  const { out } = await runKali(cmd, 60000);
  const recs: Rec[] = [];
  for (const line of out.split(/\r?\n/)) {
    const [host, ip] = line.trim().split(/\s+/);
    if (host && ip && /^\d+\.\d+\.\d+\.\d+$/.test(ip)) recs.push({ kind: 'ip', value: ip, source: 'dns', meta: { host } });
  }
  return recs;
}

const SOURCES: Record<string, { label: string; run: (d: string) => Promise<Rec[]> }> = {
  crtsh:        { label: 'crt.sh',       run: srcCrtsh },
  theharvester: { label: 'theHarvester', run: srcTheHarvester },
  subfinder:    { label: 'subfinder',    run: srcSubfinder },
  amass:        { label: 'amass',        run: srcAmass },
};

// ─── correlation: dedupe records → linked assets ─────────────────────────────
function correlate(recs: Rec[], domain: string) {
  const hosts = new Map<string, { host: string; ips: Set<string>; sources: Set<string> }>();
  const ips = new Map<string, { ip: string; hosts: Set<string>; sources: Set<string> }>();
  const emails = new Map<string, Set<string>>();

  const host = (h: string) => hosts.get(h) || hosts.set(h, { host: h, ips: new Set(), sources: new Set() }).get(h)!;
  const ipEnt = (v: string) => ips.get(v) || ips.set(v, { ip: v, hosts: new Set(), sources: new Set() }).get(v)!;

  for (const r of recs) {
    if (r.kind === 'subdomain' || r.kind === 'hostname') {
      const h = host(r.value); h.sources.add(r.source);
      if (r.meta?.ip) { h.ips.add(String(r.meta.ip)); const e = ipEnt(String(r.meta.ip)); e.hosts.add(r.value); e.sources.add(r.source); }
    } else if (r.kind === 'ip') {
      const e = ipEnt(r.value); e.sources.add(r.source);
      if (r.meta?.host) { e.hosts.add(String(r.meta.host)); host(String(r.meta.host)).ips.add(r.value); }
    } else if (r.kind === 'email') {
      (emails.get(r.value) || emails.set(r.value, new Set()).get(r.value)!).add(r.source);
    }
  }

  const assets = [...hosts.values()]
    .sort((a, b) => a.host.localeCompare(b.host))
    .map((h) => ({ host: h.host, ips: [...h.ips].sort(), sources: [...h.sources].sort() }));
  const ipList = [...ips.values()]
    .sort((a, b) => a.ip.localeCompare(b.ip))
    .map((e) => ({ ip: e.ip, hosts: [...e.hosts].sort(), sources: [...e.sources].sort() }));
  const emailList = [...emails.entries()]
    .map(([value, s]) => ({ value, sources: [...s].sort() }))
    .sort((a, b) => a.value.localeCompare(b.value));

  return {
    domain,
    assets,
    ips: ipList,
    emails: emailList,
    summary: { assets: assets.length, ips: ipList.length, emails: emailList.length },
  };
}

// ─── availability probe (which tools are installed, is the Shodan key set) ───
let statusCache: { at: number; data: unknown } | null = null;
router.get('/status', async (_req, res) => {
  if (statusCache && Date.now() - statusCache.at < 60000) { res.json(statusCache.data); return; }
  const { out } = await runKali(
    `for t in theHarvester amass subfinder shodan curl; do command -v "$t" >/dev/null 2>&1 && echo "$t=1" || echo "$t=0"; done`, 20000);
  const have: Record<string, boolean> = {};
  for (const line of out.split(/\r?\n/)) { const m = line.match(/^(\w+)=(\d)/); if (m) have[m[1].toLowerCase()] = m[2] === '1'; }
  const data = {
    distro: KALI_DISTRO,
    shodanKey: !!shodanKey(),
    sources: {
      crtsh: !!have.curl,
      theharvester: !!have.theharvester,
      subfinder: !!have.subfinder,
      amass: !!have.amass,
      shodan: !!have.shodan || true, // shodan uses the REST API via curl, so curl is enough
    },
  };
  statusCache = { at: Date.now(), data };
  res.json(data);
});

// ─── the run: stream NDJSON, one line per source event + a final "complete" ──
router.post('/passive', async (req, res) => {
  const domain = String((req.body?.domain ?? '')).trim().toLowerCase();
  const wanted: string[] = Array.isArray(req.body?.sources) && req.body.sources.length
    ? req.body.sources : [...Object.keys(SOURCES), 'shodan'];
  if (!DOMAIN_RE.test(domain)) { res.status(400).json({ error: 'invalid domain' }); return; }

  res.setHeader('Content-Type', 'application/x-ndjson');
  res.setHeader('Cache-Control', 'no-cache');
  const emit = (o: unknown) => res.write(JSON.stringify(o) + '\n');
  const bd = (recs: Rec[]) => ({
    subdomains: recs.filter((r) => r.kind === 'subdomain').length,
    ips: recs.filter((r) => r.kind === 'ip').length,
    emails: recs.filter((r) => r.kind === 'email').length,
  });

  emit({ type: 'start', domain, sources: wanted });
  const all: Rec[] = [];

  // 1) keyless sources fan out in parallel
  await Promise.all(wanted.filter((k) => SOURCES[k]).map(async (key) => {
    const s = SOURCES[key];
    emit({ type: 'source', source: key, label: s.label, status: 'running' });
    try {
      const recs = await s.run(domain);
      all.push(...recs);
      emit({ type: 'source', source: key, label: s.label, status: 'done', count: recs.length, breakdown: bd(recs) });
    } catch (e) {
      emit({ type: 'source', source: key, label: s.label, status: 'error', message: (e as Error).message });
    }
  }));

  // 2) Shodan stage — members-only domain DB. Free tier reports "members only".
  if (wanted.includes('shodan')) {
    emit({ type: 'source', source: 'shodan', label: 'shodan', status: 'running' });
    const key = shodanKey();
    if (!key) {
      emit({ type: 'source', source: 'shodan', label: 'shodan', status: 'skipped', message: 'no API key (set SHODAN_API_KEY in backend/.env.local)' });
    } else {
      try {
        const { recs, locked } = await shodanDomain(domain, key);
        if (locked && !recs.length) {
          emit({ type: 'source', source: 'shodan', label: 'shodan', status: 'skipped', message: 'domain DB needs a Shodan membership (free key locked)' });
        } else {
          all.push(...recs);
          emit({ type: 'source', source: 'shodan', label: 'shodan', status: 'done', count: recs.length, breakdown: bd(recs) });
        }
      } catch (e) {
        emit({ type: 'source', source: 'shodan', label: 'shodan', status: 'error', message: (e as Error).message });
      }
    }
  }

  // 3) DNS resolve — always: turn every discovered host into IP(s) locally.
  //    This is the free, reliable way the "Resolved IP(s)" column gets filled.
  {
    emit({ type: 'source', source: 'dns', label: 'DNS resolve', status: 'running' });
    try {
      const hosts = [domain, ...all.filter((r) => r.kind === 'subdomain').map((r) => r.value)];
      const recs = await resolveHostsLocal(hosts);
      all.push(...recs);
      const uniqIps = new Set(recs.map((r) => r.value)).size;
      emit({ type: 'source', source: 'dns', label: 'DNS resolve', status: 'done', count: recs.length, breakdown: { subdomains: 0, ips: uniqIps, emails: 0 } });
    } catch (e) {
      emit({ type: 'source', source: 'dns', label: 'DNS resolve', status: 'error', message: (e as Error).message });
    }
  }

  emit({ type: 'complete', ...correlate(all, domain) });
  res.end();
});

export default router;
