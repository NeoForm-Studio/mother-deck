# ATHENA — Build Brief

**Mission:** Build **Athena**, a retro command-bridge web interface that fronts THIS OpenClaw instance. Athena is OpenClaw's own control surface — you are building your own cockpit. Work in this directory (`~/projects/athena`).

## Operating rules
- **Load these skills first and obey them:** `webbuild-governance` (craft laws), `webbuild-standard` (build law — one premium standard, no tiers), `webbuild-qa` (acceptance bar). QA every phase at 375 / 768 / 1280 px before calling it done. Honor `prefers-reduced-motion`.
- **Local-only.** Do not expose Athena to the internet. (Cloudflared tunnel is a later, separate decision.)
- **Never fabricate UI data.** Wire panels to real gateway / cron / Telegram state, or clearly label a stub as a stub.
- **Keep secrets out of the browser bundle.** A React SPA cannot safely hold the gateway or Telegram tokens. Build a tiny local backend (Node/Express or similar) that holds secrets and proxies to the OpenClaw gateway + Telegram; the front-end talks only to that local backend.

## Stack
- **Vite + React + TypeScript** front-end. Web Audio API for the sound system. Canvas / WebGL for the CRT effects and the spinning globe.
- **Small local Node backend** for gateway/Telegram proxying + serving the app.

## How Athena connects to what already exists
- **Comms / chat →** the OpenClaw **gateway** at `ws://127.0.0.1:18789` (token in `~/.openclaw/openclaw.json`). Discover the WS RPC surface via `openclaw gateway call ...` and your own docs; the chat panel is a gateway client.
- **Automations →** OpenClaw **cron** jobs (`openclaw cron ...`). Each automation is a "project."
- **Delivery →** **Telegram** via the Athena bot (channel configured; env `TELEGRAM_BOT_TOKEN`, owner `TELEGRAM_OWNER_CHAT_ID=<YOUR_TELEGRAM_CHAT_ID>`, both in `~/.openclaw/.env`). Reports + attached files go out over Telegram; replies come back inbound.
- **Web builds →** the `webbuild-*` skills + MCP (`firecrawl` research, `playwright` QA, `vercel` deploy). Research stage runs on `claude-opus-4-8`.
- **CyberSec execution →** host-side for now; provide a **"send to Kali"** action (the Kali VM tether, `VBoxManage ... startvm kali-linux-2026.2-virtualbox-amd64`) as an OPTION, not a requirement.

## The feel (aesthetic)
Retro starship bridge — *Nostromo* (Alien/Aliens) meets *Star Wars* holotable.
- Black CRT with **amber/green phosphor** glow; scanlines, subtle flicker, chromatic aberration. **Holo-blue** for live/active elements. Weyland-Yutani industrial chrome, warning stripes, chunky monospace.
- **Boot sequence** on load: a MU/TH/UR-style "systems online" terminal wake-up before the bridge appears.
- **Sound system (Web Audio), first-class:** map SFX to events — comm chirp (message send/receive), motion-tracker ping (automation fires), klaxon (failure/alert), hydraulic hiss (panel open), key clack (typing). Master mute + volume. Ship with synthesized/placeholder SFX; real samples drop in later.

## Layout — the bridge
- **Right, large — THE COMMS:** the chat/communicator, with the **current PROJECT TITLE** on a lit bar directly above it. This is the anchor.
- **Left rail — nav + SYSTEM VITALS HUD:** gateway status, active model, Kali VM power state, and a live **API-cost meter** (klaxon if a run passes a spend threshold).

### Panels / pages
1. **OPERATIONS** — the automations directory as a retro grid of project cards. Each card = a cron automation (hourly / daily / weekly / custom). Open a card → the COMMS chat scopes to that automation so it can be **altered by talking to it**. Show next-run (an orbital clock), last run, enable/disable, and run history.
2. **LEAD→SITE pipeline** (the flagship automation template): research (Opus 4.8) → qualify lead → build site (webbuild skills) → deploy to Vercel → **transmit a Telegram mission report**: business name, Google Maps link / lead source, live deployment URL, and an **attached details file**, to the owner (and partner once configured). **Reply-to-iterate:** inbound Telegram replies ("add a database", "add an AI feature", "change X") append to that project's edit queue and the automation applies them.
3. **REVIEW INBOX** — queue of pending deliverables awaiting approve/reply.
4. **PROJECT PIPELINE** — board: lead → research → building → deployed → delivered.
5. **MISSION LOG** — scrolling activity feed of every automation run (success/fail, timestamped).
6. **CYBERSEC DECK** — reached via a slowly-spinning retro **wireframe globe** on the bridge. Opens a page with its own chat + a **legend of tabs**: Command Deck (categorized command library / cheatsheets), Firmware, Malware RE (coursework), Assignments/CTF tracker. Host-side; "send to Kali" button optional.
7. **MEMORY** — browse the governance laws + accumulated build lessons.
8. **Command palette** (global `>` input) + **quick-launch dock** (Kali, OpenCode, OpenClaw chat).

## Build in phases (walking skeleton first — QA each phase)
- **Phase 0 —** scaffold Vite+React+TS + local backend; retro theme tokens (CRT scanline/flicker/aberration), boot sequence, sound-system skeleton, and the bridge layout shell.
- **Phase 1 —** COMMS panel wired to the gateway (send + receive a real chat turn) + project-title bar + System Vitals HUD reading real gateway/model state.
- **Phase 2 —** OPERATIONS grid + one real end-to-end automation (a cron that sends a Telegram ping) + MISSION LOG.
- **Phase 3 —** the LEAD→SITE pipeline automation + REVIEW INBOX + PIPELINE board + Telegram report-with-attachment + reply-to-iterate.
- **Phase 4 —** CYBERSEC deck (globe portal + tabs).
- **Phase 5 —** polish: full sound-design pass, MEMORY browser, command palette, quick-launch dock.

## Start
Confirm the plan back to me, scaffold **Phase 0**, and show me the booting bridge before moving on.
