/* ═══════════════════════════════════════════════════════════════════════
   WALKTHROUGH CONTENT — premade, editable. No AI.
   Step shape:
     { target: '<css selector>', title, body, placement,
       module?: '<subsystem id>',   // open this module first
       frame?: true }               // target is INSIDE the module's iframe
   placement: 'top' | 'bottom' | 'left' | 'right' | 'auto'
   Module ids: terminal, recon, command, scripts, malware, payload, loot,
               killchain, blue, engage, ctf, recorder
   Edit / add / reorder freely — this is just data. The launcher menu lists
   every entry below in order.
   ═══════════════════════════════════════════════════════════════════════ */
window.WALKTHROUGHS = {};

/* ── 0 · The deck itself ────────────────────────────────────────────── */
window.WALKTHROUGHS['deck-orientation'] = {
  id: 'deck-orientation',
  name: 'Deck Orientation',
  steps: [
    { target: '.m-brand', placement: 'bottom', title: 'This is MOTHER',
      body: 'The MU/TH/UR 6000 is the cybersecurity deck — the offensive + defensive side. Everything green belongs to MOTHER; the amber/holo Athena bridge is the other half of the app.' },
    { target: '#spine', placement: 'right', title: 'Subsystems · your nav',
      body: 'The twelve subsystems on the left are the deck’s tools. Click one to load it into the stage. The lit-blue entry is the one you’re in.' },
    { target: '.m-stage', placement: 'left', title: 'The stage',
      body: 'The selected subsystem runs here. Right now it’s the Terminal — a real Kali shell. Switching subsystems swaps what fills this panel.' },
    { target: '.m-core', placement: 'left', title: 'MOTHER core + vitals',
      body: 'The pulsing core is MOTHER’s status eye. Below it the vitals summarise your operation: Kali link, recon coverage, loot captured, kill-chain phase, threat posture.' },
    { target: '.m-status', placement: 'bottom', title: 'Mission status',
      body: 'Up here MOTHER tracks the live picture — Kali link, active target, current engagement.' },
    { target: '.m-log', placement: 'top', title: 'MOTHER speaks',
      body: 'The footer is MOTHER’s voice line and query box. Later you’ll be able to ask her to explain things in more detail right here.' },
    { target: '#wt-launch', placement: 'bottom', title: 'Every section has a tour',
      body: 'Open this menu any time and pick a walkthrough — one per subsystem. They’re all editable data in steps.example.js.' },
  ],
};

/* ── 1 · Terminal ───────────────────────────────────────────────────── */
window.WALKTHROUGHS['terminal'] = {
  id: 'terminal', name: '01 · Terminal',
  steps: [
    { module: 'terminal', frame: true, target: '.backend-tabs', placement: 'bottom', title: 'Backend selector',
      body: 'Pick where the shell runs: WSL (everyday Kali), VM · Isolated (the safe detonation lab), SSH, Docker, or Local. WSL and VM are the two you’ll use most.' },
    { module: 'terminal', frame: true, target: '.connbar', placement: 'bottom', title: 'Connection bar',
      body: 'The fields here change per backend — a distro for WSL, host/user for SSH. Hit CONNECT and MOTHER spins up the shell.' },
    { module: 'terminal', frame: true, target: '#term', placement: 'top', title: 'The live shell',
      body: 'This is a real terminal — real nmap, metasploit, scripts. Cooked mode for WSL; a full interactive PTY over SSH/VM so TUIs like msfconsole work.' },
  ],
};

/* ── 2 · Recon Map ──────────────────────────────────────────────────── */
window.WALKTHROUGHS['recon'] = {
  id: 'recon', name: '02 · Recon Map',
  steps: [
    { module: 'recon', frame: true, target: '#map', placement: 'left', title: 'Live network topology',
      body: 'The sector-map engine, repurposed: the amber core is your attack box, each cluster is a discovered host, and the satellites are its open ports. Click a host to target it.' },
    { module: 'recon', frame: true, target: '#ingest', placement: 'left', title: 'Ingest nmap',
      body: 'Paste real nmap output here and hit INGEST — the map builds itself from your scan. Ports are colour-coded by risk (web / remote / risky).' },
    { module: 'recon', frame: true, target: '#btn-sample', placement: 'top', title: 'Try it instantly',
      body: 'No scan handy? SAMPLE loads a demo network so you can see the topology right away.' },
    { module: 'recon', frame: true, target: '#host-list', placement: 'left', title: 'Discovered hosts',
      body: 'Every host in a sortable list. Click one to make it the active target — the map rotates it to the front and the detail panel fills in.' },
  ],
};

/* ── 3 · Command Deck ───────────────────────────────────────────────── */
window.WALKTHROUGHS['command'] = {
  id: 'command', name: '03 · Command Deck',
  steps: [
    { module: 'command', frame: true, target: '.m-brand', placement: 'bottom', title: 'The cheatsheet',
      body: '107 real pentest commands, categorised, searchable, copy-ready — so you stop googling syntax mid-engagement.' },
    { module: 'command', frame: true, target: '#p-TARGET', placement: 'bottom', title: 'Placeholder auto-fill',
      body: 'Set TARGET / LHOST / LPORT / URL / WORDLIST once here, and every command below rewrites itself with your values pre-filled. Copy grabs the finished command.' },
    { module: 'command', frame: true, target: '#cats', placement: 'right', title: 'Categories',
      body: 'Jump by phase — Recon, Enumeration, Web, Exploitation, Post-Exploit, Priv-Esc, Pivoting, Password Attacks. The count shows how many commands each holds.' },
    { module: 'command', frame: true, target: '#q', placement: 'bottom', title: 'Search everything',
      body: 'Filter across all categories by command, description, or tag — type “smb” or “kerberos” and it narrows instantly.' },
    { module: 'command', frame: true, target: '#cards', placement: 'left', title: 'The commands',
      body: 'Each card is a command with a plain-English description and a copy button. What you copy already has your placeholder values baked in.' },
  ],
};

/* ── 4 · Payload Forge ──────────────────────────────────────────────── */
window.WALKTHROUGHS['payload'] = {
  id: 'payload', name: '04 · Payload Forge',
  steps: [
    { module: 'payload', frame: true, target: '#p-LHOST', placement: 'bottom', title: 'Set LHOST / LPORT',
      body: 'Enter your listener IP and port once. Every payload below regenerates live with these values — no hand-editing.' },
    { module: 'payload', frame: true, target: '#cats', placement: 'right', title: 'Payload types',
      body: '51 payloads across Reverse Shells, Bind Shells, MSFVenom, Listeners, TTY Upgrade, and Encoders — the whole revshells.com toolkit, built in.' },
    { module: 'payload', frame: true, target: '#lh-nc', placement: 'bottom', title: 'Matching listener',
      body: 'This always shows the nc and msfconsole listener for your current port — copy the shell and the catcher as a pair.' },
    { module: 'payload', frame: true, target: '#cards', placement: 'left', title: 'Grab a shell',
      body: 'Each card is a ready payload (the PowerShell one is genuinely UTF-16LE base64-encoded). Copy, run, catch.' },
  ],
};

/* ── 5 · Scripts Vault ──────────────────────────────────────────────── */
window.WALKTHROUGHS['scripts'] = {
  id: 'scripts', name: '05 · Scripts Vault',
  steps: [
    { module: 'scripts', frame: true, target: '.m-brand', placement: 'bottom', title: 'Your script library',
      body: 'Keep the scripts you actually reuse — recon wrappers, shell handlers, helpers — one click from copy or run.' },
    { module: 'scripts', frame: true, target: '.navlist', placement: 'right', title: 'Filter by language',
      body: 'Narrow to bash, python, powershell, or ruby, or filter by tag. The search box matches name, description, tags, and code.' },
    { module: 'scripts', frame: true, target: '#cards', placement: 'left', title: 'The scripts',
      body: 'Each card shows syntax-highlighted code with Copy, Run-in-shell, Edit, and Delete.' },
    { module: 'scripts', frame: true, target: '#btn-new', placement: 'bottom', title: 'Add your own',
      body: 'New Script opens an inline editor — name, language, tags, code. It saves to local storage so your library persists.' },
  ],
};

/* ── 6 · Loot Vault ─────────────────────────────────────────────────── */
window.WALKTHROUGHS['loot'] = {
  id: 'loot', name: '06 · Loot Vault',
  steps: [
    { module: 'loot', frame: true, target: '#ingest', placement: 'left', title: 'Paste tool output',
      body: 'Drop raw output from any tool here and PARSE. The vault auto-extracts credentials, hashes, hosts, URLs, and emails.' },
    { module: 'loot', frame: true, target: '#tabs', placement: 'bottom', title: 'Sorted loot',
      body: 'Findings land in tabs by type. Hashes are auto-classified (NTLM, MD5, SHA-256, bcrypt…) so you know what to crack.' },
    { module: 'loot', frame: true, target: '#btn-export-csv', placement: 'top', title: 'Export',
      body: 'Pull everything out as JSON, or the current tab as CSV, when it’s time to write up.' },
  ],
};

/* ── 7 · Malware Lab ────────────────────────────────────────────────── */
window.WALKTHROUGHS['malware'] = {
  id: 'malware', name: '07 · Malware Lab',
  steps: [
    { module: 'malware', frame: true, target: '.warn-banner', placement: 'bottom', title: 'Metadata only',
      body: 'Sample binaries are never committed to git — this tracks hashes, family, and RE notes for coursework. The binaries live in a gitignored quarantine dir.' },
    { module: 'malware', frame: true, target: '#add-toggle', placement: 'bottom', title: 'Register a sample',
      body: 'Add a sample by filename, family, type, and threat level — a plausible SHA-256 is generated if you leave the hash blank.' },
    { module: 'malware', frame: true, target: '.m-stats', placement: 'bottom', title: 'Triage at a glance',
      body: 'The counters track your queue — samples, analysing, queued, critical. Select any sample for static-triage actions, IOCs, and a per-sample RE journal.' },
  ],
};

/* ── 8 · Kill Chain ─────────────────────────────────────────────────── */
window.WALKTHROUGHS['killchain'] = {
  id: 'killchain', name: '08 · Kill Chain',
  steps: [
    { module: 'killchain', frame: true, target: '#kc-cols', placement: 'top', title: 'MITRE ATT&CK board',
      body: 'The fourteen ATT&CK tactics as columns, each holding real techniques. Click a technique to mark it USED — it lights up as part of your attack path.' },
    { module: 'killchain', frame: true, target: '#path-flow', placement: 'bottom', title: 'Your attack path',
      body: 'The techniques you’ve used, chained in tactic order — a visual story of how you compromised the target.' },
    { module: 'killchain', frame: true, target: '#btn-export', placement: 'bottom', title: 'Export the report',
      body: 'Generate a Markdown attack-path report, grouped by tactic, ready to drop into a writeup.' },
  ],
};

/* ── 9 · Blue Deck ──────────────────────────────────────────────────── */
window.WALKTHROUGHS['blue'] = {
  id: 'blue', name: '09 · Blue Deck',
  steps: [
    { module: 'blue', frame: true, target: '.navlist', placement: 'right', title: 'The defensive half',
      body: 'Three tools: Log Triage, a Sigma/YARA detection notebook, and IOC matching. The blue-team side of your studies.' },
    { module: 'blue', frame: true, target: '#btn-analyze', placement: 'bottom', title: 'Log triage',
      body: 'Paste a log or alert blob and ANALYZE — suspicious lines are flagged and ranked by severity (reverse shells, encoded PowerShell, shadow access, new users…).' },
  ],
};

/* ── 10 · Engagements ───────────────────────────────────────────────── */
window.WALKTHROUGHS['engage'] = {
  id: 'engage', name: '10 · Engagements',
  steps: [
    { module: 'engage', frame: true, target: '.pane--nav', placement: 'right', title: 'Scope a box',
      body: 'Each engagement is one target — HTB, THM, an assignment. Everything you do scopes to the selected one.' },
    { module: 'engage', frame: true, target: '#detail', placement: 'left', title: 'Everything in one place',
      body: 'Notes, credentials, user/root flags, and a timeline all live here per box, so nothing gets lost mid-engagement.' },
    { module: 'engage', frame: true, target: '#cred-add', placement: 'top', title: 'Auto-writeup',
      body: 'As you capture creds and log steps, Generate Writeup turns the whole engagement into a Markdown report with one click.' },
  ],
};

/* ── 11 · CTF / Assignments ─────────────────────────────────────────── */
window.WALKTHROUGHS['ctf'] = {
  id: 'ctf', name: '11 · CTF / Assignments',
  steps: [
    { module: 'ctf', frame: true, target: '.navlist', placement: 'right', title: 'Two trackers',
      body: 'Toggle between CTF Events — flags found vs total, with progress bars — and Assignments for coursework with due dates.' },
    { module: 'ctf', frame: true, target: '#btn-add-ctf', placement: 'bottom', title: 'Track a competition',
      body: 'Add an event with its platform and flag count; the +/- steppers update your progress as you capture flags.' },
    { module: 'ctf', frame: true, target: '#clock', placement: 'left', title: 'Deadlines',
      body: 'Assignments compare against today’s date and flag anything overdue, so nothing slips.' },
  ],
};

/* ── 12 · Session Recorder ──────────────────────────────────────────── */
window.WALKTHROUGHS['recorder'] = {
  id: 'recorder', name: '12 · Session Recorder',
  steps: [
    { module: 'recorder', frame: true, target: '#btn-rec', placement: 'bottom', title: 'Record a session',
      body: 'Asciinema-style capture: hit Record and type into the mini-shell — every command and its timing is saved as a replayable cast.' },
    { module: 'recorder', frame: true, target: '#btn-play', placement: 'bottom', title: 'Replay + speed',
      body: 'Play any cast back with the recorded timing (0.5×–4×). Great for embedding a clean run of a hack in a writeup.' },
    { module: 'recorder', frame: true, target: '#cast-list', placement: 'left', title: 'Saved casts',
      body: 'Your recordings live here — play, export as JSON, or delete. The pre-loaded “DEMO — FOOTHOLD” cast replays a full scripted attack.' },
  ],
};
