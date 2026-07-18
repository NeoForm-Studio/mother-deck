# MOTHER Deck — the full Athena system

![MOTHER cyber deck](media/cyber-deck-preview.jpeg)

### Deck demo

<video src="https://raw.githubusercontent.com/piercewalker74-ops/mother-deck/master/media/cyber-demo.mp4" controls muted playsinline poster="https://raw.githubusercontent.com/piercewalker74-ops/mother-deck/master/media/cyber-deck-preview.jpeg" width="100%"></video>

▶ If the player above doesn't load, [watch / download the demo video directly](https://raw.githubusercontent.com/piercewalker74-ops/mother-deck/master/media/cyber-demo.mp4).

---

## What is this?

**Athena is a personal command center** — a single retro-terminal "starship
bridge" web app that runs two very different systems from one interface:

1. **A website-production pipeline** that finds leads, builds real multi-page
   sites with an AI agent, reviews them, and deploys them — mostly hands-off.
2. **MOTHER**, a self-contained **cybersecurity learning lab** for practicing
   red/blue-team skills against your own machines.

This repo (`mother-deck`) is the **complete build with both halves**. The
website-pipeline half is also published on its own, with the security deck
removed, as [`athena-web-builder`](https://github.com/piercewalker74-ops/athena-web-builder).

Secrets, API keys, client data, and finished client sites have been removed; the
code and lab tooling are intact. It ships with localhost defaults — you bring your
own keys.

> **Authorized use only.** The MOTHER deck includes offensive security tooling
> intended **only** for use against systems you own or are explicitly authorized
> to test (your own lab VMs, CTF targets, engagements with written permission).
> It exists for **educational and defensive** purposes. Do not point it at
> systems you do not own or have permission to test.

---

## Half 1 — the website pipeline

An agent-driven assembly line that turns a lead into a shipped website. The
control bridge (`frontend/`) drives it, and a Node/Express backend
(`backend/src/pipeline`) runs the work:

**leads → build → review → deploy**

- **Leads** are stored and queued.
- **Build** shells out to an external AI agent (the [OpenClaw](https://openclaw.ai)
  CLI) which scaffolds a real multi-page site from a template.
- **Review** collects the generated sites into an inbox for approval.
- **Deploy** optionally ships to Vercel and reports back over Telegram / SMS.

An auto-scheduler ("the circuit") can run this whole loop on a cadence. The
backend orchestrates the agent — it does **not** contain the LLM itself.

The bridge UI has sections for chat (COMMS), automations (OPERATIONS), the build
lane (PIPELINE), a catalog of ~150 mined UI patterns (SHOWCASE), a review queue
(INBOX), a live event stream (MISSION LOG), and a notes browser (MEMORY).

## Half 2 — the MOTHER cyber deck

A self-contained security lab under `frontend/public/cyber/`, backed by three
server surfaces. Everything defaults to **off** and **localhost-only**:

- **`backend/src/routes/reconRoutes.ts` — passive OSINT aggregator.**
  Orchestrates standard, read-only reconnaissance tools (crt.sh, theHarvester,
  subfinder, amass, and Shodan's pre-scanned database), validates every domain
  against an injection guard, keeps secrets out of argv/history, and correlates
  the results into one view. Passive only — it never touches the target.
- **`backend/src/pty.ts` — web terminal relay.** A browser terminal (xterm.js)
  wired to a real shell over WebSocket, with ssh / WSL / Docker / local / VM
  backends. This is remote code execution by design, so it stays **disabled
  unless `ATHENA_TERMINAL_ENABLED=1`**, is bound to localhost, and is gated by a
  per-session token.
- **`backend/src/learn.ts` — guided-demo planner.** A local tutor that scripts
  walkthroughs of the deck's tools.

The deck's static pages cover a recon map, blue-team log analysis, a command
reference, payload / lab tooling, kill-chain and engagement trackers, and a
session recorder — all using synthetic lab data.

---

## Architecture at a glance

```
 Browser (React bridge)  ──HTTP/WS──►  Express backend  ──spawns──►  OpenClaw agent CLI
        :5173                              :3001                        (build worker)
                                             │
                    Vercel deploy · Telegram/Twilio reports · MOTHER deck surfaces
```

## Quick start

```bash
npm install
cp .env.example backend/.env.local     # fill in your values
npm run dev                            # backend :3001, frontend :5173
```

The website pipeline runs with localhost defaults. Deck features stay dark until
you opt into them via env (`ATHENA_TERMINAL_ENABLED`, `SHODAN_API_KEY`, VM
settings). See [`.env.example`](./.env.example) for every setting, and
`SECURITY-HARDENING-REPORT.md` for the backend hardening notes (loopback binding,
injection guards, SSRF protection, secret hygiene).

## License

MIT — see [LICENSE](./LICENSE).
