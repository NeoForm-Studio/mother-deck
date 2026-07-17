/**
 * Terminal relay — PTY-over-WebSocket bridge for the MOTHER cybersec deck.
 * ─────────────────────────────────────────────────────────────────────────
 * Bridges an xterm.js terminal in the browser to a real shell on the host.
 * Four selectable backends:
 *   ssh    — ssh2 (pure JS) → REAL remote PTY (the Kali VM path)
 *   wsl    — wsl.exe <distro> → Kali WSL install (cooked mode)
 *   docker — docker exec <container> (cooked mode)
 *   local  — host shell: bash / pwsh / cmd (cooked mode)
 *
 * SECURITY: This is remote-code-execution by design, so it is DISABLED unless
 * ATHENA_TERMINAL_ENABLED=1. When enabled it is still bound to the local
 * backend only and every /pty socket must present the per-run session token.
 */

import { spawn, execFile } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { randomBytes } from 'crypto';
import { promisify } from 'util';
import { createConnection } from 'net';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { WebSocket } from 'ws';
import { Client as SSHClient } from 'ssh2';

const execFileP = promisify(execFile);

export const TERMINAL_ENABLED = process.env.ATHENA_TERMINAL_ENABLED === '1';
export const PTY_TOKEN = TERMINAL_ENABLED ? randomBytes(16).toString('hex') : '';

interface InitMsg {
  t: 'init';
  backend?: 'ssh' | 'wsl' | 'docker' | 'local' | 'vm';
  cols?: number; rows?: number;
  host?: string; port?: string | number; user?: string; password?: string; keyPath?: string;
  distro?: string; container?: string; shell?: string; vmName?: string;
}
interface Session { write(d: string): void; resize(c: number, r: number): void; kill(): void; }

const send = (ws: WebSocket, obj: unknown) => {
  if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(obj));
};

/** Handle a single authenticated /pty WebSocket connection. */
export function handlePtyConnection(ws: WebSocket): void {
  let session: Session | null = null;
  let started = false;

  ws.on('message', (raw) => {
    let msg: Record<string, unknown>;
    try { msg = JSON.parse(raw.toString()); } catch { return; }

    if (msg.t === 'init' && !started) {
      started = true;
      startBackend(ws, msg as unknown as InitMsg, (s) => { session = s; });
      return;
    }
    if (!session) return;
    if (msg.t === 'i') session.write(String(msg.d ?? ''));
    else if (msg.t === 'r') session.resize(Number(msg.c) || 80, Number(msg.r) || 24);
  });

  ws.on('close', () => { session?.kill(); });
}

function startBackend(ws: WebSocket, cfg: InitMsg, onSession: (s: Session) => void) {
  const backend = cfg.backend ?? 'local';
  const cols = cfg.cols ?? 80;
  const rows = cfg.rows ?? 24;
  const banner = (m: string) => send(ws, { t: 'o', d: `\x1b[38;5;46m${m}\x1b[0m\r\n` });
  const status = (level: string, m: string) => send(ws, { t: 's', level, msg: m });

  try {
    if (backend === 'vm')  return void startVM(ws, cfg, cols, rows, onSession, banner, status);
    if (backend === 'ssh') return startSSH(ws, cfg, cols, rows, onSession, banner, status);
    if (backend === 'wsl') {
      // Wrap bash in util-linux `script`, which allocates a REAL Linux pty for
      // the shell. That gives proper keystroke echo, line editing, tab-complete,
      // colours and full-screen TUIs — no browser-side line editor needed.
      // stty seeds the initial window size (our stdio is a pipe, not a console).
      const distro = cfg.distro ? ['-d', cfg.distro] : [];
      // SECURITY (trace reduction): the deck terminal is where offensive commands run —
      // route history to /dev/null so targets/commands are never persisted to the Kali
      // box's ~/.bash_history. (The local host shell, below, keeps its normal history.)
      const inner = `stty rows ${rows} cols ${cols} 2>/dev/null; export HISTFILE=/dev/null HISTSIZE=0; exec bash -li`;
      const args = [...distro, '-e', 'script', '-q', '-c', inner, '/dev/null'];
      return startPipe(ws, 'wsl.exe', args, onSession, banner, status,
        `WSL${cfg.distro ? ` · ${cfg.distro}` : ''}`, false);
    }
    if (backend === 'docker') {
      const shell = cfg.shell || 'bash';
      return startPipe(ws, 'docker', ['exec', '-i', cfg.container ?? '', shell],
        onSession, banner, status, `Docker · ${cfg.container ?? '?'}`);
    }
    const sh = pickLocalShell(cfg.shell);
    return startPipe(ws, sh.cmd, sh.args, onSession, banner, status, `Local · ${sh.label}`);
  } catch (e) {
    status('err', `Backend failed: ${(e as Error).message}`);
    send(ws, { t: 'exit' });
  }
}

function pickLocalShell(pref?: string) {
  if (pref === 'pwsh') return { cmd: 'powershell.exe', args: ['-NoLogo', '-NoExit'], label: 'PowerShell' };
  if (pref === 'cmd')  return { cmd: 'cmd.exe', args: [] as string[], label: 'cmd' };
  const bash = 'C:\\Program Files\\Git\\bin\\bash.exe';
  if (existsSync(bash)) return { cmd: bash, args: ['-i'], label: 'bash' };
  return { cmd: 'cmd.exe', args: [] as string[], label: 'cmd' };
}

function startSSH(
  ws: WebSocket, cfg: InitMsg, cols: number, rows: number,
  onSession: (s: Session) => void, banner: (m: string) => void, status: (l: string, m: string) => void,
) {
  const conn = new SSHClient();
  status('info', `SSH → ${cfg.user}@${cfg.host}:${cfg.port ?? 22} …`);

  conn.on('ready', () => {
    banner(`MOTHER LINK ESTABLISHED — ${cfg.user}@${cfg.host}`);
    status('ok', `connected · ${cfg.host}`);
    conn.shell({ term: 'xterm-256color', cols, rows }, (err, stream) => {
      if (err) { status('err', `shell: ${err.message}`); conn.end(); return; }
      stream.on('data', (d: Buffer) => send(ws, { t: 'o', d: d.toString('utf8') }));
      stream.stderr.on('data', (d: Buffer) => send(ws, { t: 'o', d: d.toString('utf8') }));
      stream.on('close', () => { send(ws, { t: 'exit' }); conn.end(); });
      onSession({
        write: (d) => stream.write(d),
        resize: (c, r) => stream.setWindow(r, c, 0, 0),
        kill: () => conn.end(),
      });
    });
  });
  conn.on('error', (e) => { status('err', `SSH: ${e.message}`); send(ws, { t: 'exit' }); });
  conn.on('close', () => send(ws, { t: 'exit' }));
  conn.on('keyboard-interactive', (_n, _i, _il, _p, finish) => finish([cfg.password ?? '']));

  const auth: Record<string, unknown> = {
    host: cfg.host, port: Number(cfg.port ?? 22), username: cfg.user,
    readyTimeout: 12000, keepaliveInterval: 15000, tryKeyboard: true,
  };
  if (cfg.password) auth.password = cfg.password;
  if (cfg.keyPath && existsSync(cfg.keyPath)) auth.privateKey = readFileSync(cfg.keyPath);
  conn.connect(auth);
}

// ─── VM (isolated) backend ──────────────────────────────────────────────────
// Additive backend: boots an isolated VirtualBox Kali VM (host-only network) if
// it isn't running, waits for SSH, then hands off to the existing startSSH path.
// The VM is the safe detonation lab; WSL stays the everyday backend. Connection
// details come from backend/.env.local (gitignored) or env — never hardcoded.
const VBOX_DEFAULT = 'C:\\Program Files\\Oracle\\VirtualBox\\VBoxManage.exe';
const VBOXMANAGE = process.env.VBOXMANAGE || (existsSync(VBOX_DEFAULT) ? VBOX_DEFAULT : 'VBoxManage');

function loadVmConfig() {
  const parsed: Record<string, string> = {};
  const candidates = [
    join(process.cwd(), '.env.local'),
    join(dirname(fileURLToPath(import.meta.url)), '..', '.env.local'),
  ];
  for (const p of candidates) {
    if (!existsSync(p)) continue;
    for (const line of readFileSync(p, 'utf8').split('\n')) {
      if (line.trim().startsWith('#')) continue;
      const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/);
      if (m) parsed[m[1]] = m[2];
    }
    break;
  }
  return {
    name: process.env.VM_NAME || parsed.VM_NAME || '',
    host: process.env.VM_HOST || parsed.VM_HOST || '192.168.56.10',
    user: process.env.VM_USER || parsed.VM_USER || 'kali',
    pass: process.env.VM_PASS || parsed.VM_PASS || '',
    headless: (process.env.VM_HEADLESS || parsed.VM_HEADLESS || '') === '1',
  };
}

function waitForPort(host: string, port: number, timeoutMs: number, onTick: () => void): Promise<boolean> {
  return new Promise((resolve) => {
    const deadline = Date.now() + timeoutMs;
    const attempt = () => {
      const sock = createConnection({ host, port, timeout: 3000 });
      sock.once('connect', () => { sock.destroy(); resolve(true); });
      const retry = () => {
        sock.destroy();
        if (Date.now() > deadline) return resolve(false);
        onTick();
        setTimeout(attempt, 2000);
      };
      sock.once('error', retry);
      sock.once('timeout', retry);
    };
    attempt();
  });
}

async function startVM(
  ws: WebSocket, cfg: InitMsg, cols: number, rows: number,
  onSession: (s: Session) => void, banner: (m: string) => void, status: (l: string, m: string) => void,
) {
  const vm = loadVmConfig();
  const name = cfg.vmName || vm.name;
  const host = cfg.host || vm.host;
  const user = cfg.user || vm.user;
  const password = cfg.password || vm.pass;

  if (!name) {
    status('err', 'VM not configured — set VM_NAME in backend/.env.local');
    send(ws, { t: 'exit' });
    return;
  }

  try {
    const { stdout } = await execFileP(VBOXMANAGE, ['list', 'runningvms'], { windowsHide: true });
    const running = stdout.toLowerCase().includes(name.toLowerCase());

    if (!running) {
      status('info', `booting isolated VM: ${name} …`);
      banner(`ISOLATED LAB — booting ${name} (host-only, no internet)`);
      const type = vm.headless ? 'headless' : 'gui';
      await execFileP(VBOXMANAGE, ['startvm', name, '--type', type], { windowsHide: true });
    } else {
      status('info', `VM ${name} already running`);
    }

    status('info', `waiting for SSH ${host}:22 …`);
    const up = await waitForPort(host, 22, 120000, () => status('info', `waiting for SSH ${host}:22 …`));
    if (!up) {
      status('err', `SSH not reachable at ${host}:22 — is sshd up and the static IP set in the guest?`);
      send(ws, { t: 'exit' });
      return;
    }

    status('ok', `VM ready · ${host}`);
    // Hand off to the existing SSH backend, unchanged.
    startSSH(ws, { t: 'init', host, port: '22', user, password }, cols, rows, onSession, banner, status);
  } catch (e) {
    status('err', `VM boot failed: ${(e as Error).message}`);
    send(ws, { t: 'exit' });
  }
}

function startPipe(
  ws: WebSocket, cmd: string, args: string[],
  onSession: (s: Session) => void, banner: (m: string) => void, status: (l: string, m: string) => void,
  label: string, cooked = true,
) {
  status('info', `spawning ${label} …`);
  const child = spawn(cmd, args, { windowsHide: true });
  let alive = true;

  child.on('spawn', () => {
    banner(`MOTHER SHELL — ${label}${cooked ? '  [cooked mode: line commands + scripts]' : '  [interactive pty]'}`);
    status('ok', label);
  });
  child.stdout.on('data', (d: Buffer) => send(ws, { t: 'o', d: d.toString('utf8') }));
  child.stderr.on('data', (d: Buffer) => send(ws, { t: 'o', d: d.toString('utf8') }));
  child.on('error', (e) => { status('err', `${label}: ${e.message}`); send(ws, { t: 'exit' }); });
  child.on('close', (code) => {
    alive = false;
    send(ws, { t: 'o', d: `\r\n\x1b[38;5;244m[process exited · code ${code}]\x1b[0m\r\n` });
    send(ws, { t: 'exit' });
  });

  onSession({
    write: (d) => { if (alive) child.stdin.write(d); },
    resize: () => { /* cooked mode: no window size */ },
    kill: () => { if (alive) child.kill(); },
  });
}
