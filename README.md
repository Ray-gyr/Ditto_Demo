# Ditto — Pre-Date Spark Demo

> *"Most dating apps solve matching. But matching isn't the hard part — showing up is."*

Ditto lives entirely in iMessage — no app to download, no new habits to build. It sends a match every Wednesday, building anticipation all week. 
Ditto handles *who* and *when*. This demo explores **how to show up**.

---

## What This Is

A concept demo for **Pre-Date Spark** — a feature idea built on top of Ditto's existing iMessage-native experience.

The feature: before the date, Ditto looks at both people's profiles and sends each of them a small, fun task tailored to who they are together. Same moment, two perspectives — they show up already having something to reveal, compare, or laugh about.

The task isn't a question, it's an action. And if someone doesn't bother doing it — that tells you something too. **The task is a filter.**

---

## How It Works

1. Enter two people's names, interests, and where they're going on their date.
2. Hit **Generate** — the app calls Claude (claude-sonnet-4 with extended thinking) to produce a personalized pre-date task for each person.
3. Each task references both profiles but is written from that person's perspective, with the other person named.

The tasks are asymmetric on purpose: same energy, different lens — designed to create a moment of comparison or reveal at the date, not just parallel sharing.

**About the UI:** In the real Ditto flow, each person only sees their own message in iMessage. The side-by-side dual-phone mockup here is purely a demo convenience — it lets you see both sides of the task at once without switching accounts.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| UI | React 19 + Tailwind CSS v4 |
| AI | Anthropic Claude (`claude-sonnet-4-20250514`) with interleaved thinking |
| Language | TypeScript |

---

## Getting Started

### 1. Clone and install

```bash
git clone <your-repo-url>
cd ditto_demo
npm install
```

### 2. Set up environment variables

Create a `.env.local` file in the project root:

```bash
cp .env.local.example .env.local   # if an example file exists
# or create it manually:
```

```env
# .env.local
ANTHROPIC_API_KEY=your_api_key_here
```

To get an API key, visit [console.anthropic.com](https://console.anthropic.com) → API Keys → Create Key.

> **Note:** The server will throw an error at startup if `ANTHROPIC_API_KEY` is missing. This is intentional — it fails fast rather than producing a cryptic runtime error on the first request.

### 3. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Project Structure

```
src/
└── app/
    ├── page.tsx          # Main UI — scenario setup + dual phone mockups
    ├── layout.tsx        # Root layout
    └── api/
        └── chat/
            └── route.ts  # POST handler — validates input, calls Claude, returns tasks
```

---

## Security Notes

- All user inputs are sanitized server-side before being interpolated into the prompt (length cap, character allowlist, injection-character stripping).
- Raw API errors are never surfaced to the client — only a fixed user-facing string is shown.
- The `.env.local` file is git-ignored by default.
