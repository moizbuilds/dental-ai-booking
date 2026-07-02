# BrightSmile — AI Appointment Maker

An AI receptionist ("Maya") that books dental appointments through a natural conversation. Built as a re-skinnable template for AI consulting clients: swap the clinic name, services, hours, and colors, and it becomes any appointment-based business (salon, physio, tuition center).

## How it works (the 30-second version)

```
Patient types in chat  →  /api/chat sends the conversation to Claude
                       →  Claude calls tools: get_available_slots / book_appointment
                       →  our code runs them against SQLite (lib/db.ts)
                       →  Claude confirms the booking in plain English
Clinic staff           →  /admin shows every booking, live
```

The AI never touches the database directly — it can only request the two
actions we defined. That's the core safety pattern of this whole app.

## Run it

```bash
cp .env.local.example .env.local   # then paste your Anthropic API key
npm install
npm run dev                        # → http://localhost:3000
```

- **/** — patient-facing booking chat
- **/admin** — staff dashboard of booked appointments

## Where to customize per client

| What | Where |
|---|---|
| Clinic name, services, prices, hours, tone | `SYSTEM_PROMPT` in `app/api/chat/route.ts` |
| Schedule rules (open hours, closed days) | constants at the top of `lib/db.ts` |
| Brand colors & fonts | design tokens in `app/globals.css` + `app/layout.tsx` |

## Tech

Next.js 14 (App Router) · TypeScript · Tailwind · SQLite (better-sqlite3) · Claude (Anthropic SDK, tool use)
