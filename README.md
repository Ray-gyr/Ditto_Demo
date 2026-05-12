# Ditto — Pre-Date Spark Demo

> *"Most dating apps solve matching. But matching isn't the hard part — showing up is."*

Ditto lives entirely in iMessage — no app to download, no new habits to build. It sends a match every Wednesday, building anticipation all week. It handles *who* and *when*. This demo explores **how to show up**.

---

## What This Is

A concept demo for **Pre-Date Spark** — a feature idea built on top of Ditto's existing iMessage-native experience.

Before the date, Ditto sends both people a small task generated from their profiles. It's an action, not a question. Both get their own version — same moment, two perspectives. They sit down already having something to reveal.

And if someone doesn't bother doing it — that tells you something too. **The task is a filter.**

---

## How It Works

1. You enter two people's names, interests, and where they're going on their date.
2. The app calls Claude (claude-sonnet-4, with extended thinking) to generate a personalized pre-date mission for each person.
3. The result is displayed as two iMessage mockups — one per phone — so you can see exactly what each person would receive on Wednesday morning.

The tasks are asymmetric on purpose: same energy, different lens. They're designed to create a moment of comparison or reveal at the date — something to spark mutual banter, not just parallel sharing.

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
