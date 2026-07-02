/**
 * ============================================================
 * app/api/chat/route.ts — The AI receptionist's brain
 * ============================================================
 * WHAT THIS FILE DOES:
 * This is the server endpoint the chat UI talks to. It sends the
 * conversation to Claude along with two "tools" (real functions
 * Claude is allowed to call): one to check open slots, one to
 * book. Claude decides WHEN to call them; our code EXECUTES them.
 *
 * WHY THIS PATTERN (the "agentic tool loop"):
 * The AI never touches the database itself — it can only request
 * actions we've explicitly defined. That's the safety boundary:
 * Claude does the talking, our code does the doing. The naive
 * alternative (asking the AI to output SQL, then running it) would
 * let a clever patient talk the AI into damaging the database.
 * ============================================================
 */

import Anthropic from "@anthropic-ai/sdk";
import { getAvailableSlots, bookAppointment } from "@/lib/db";

// CONCEPT: an "API route" is server-side code. It runs on the machine
// hosting the app, never in the patient's browser — which is why it's
// safe for it to hold the secret API key and touch the database.
const client = new Anthropic(); // reads ANTHROPIC_API_KEY from .env.local

// ------------------------------------------------------------
// The receptionist's job description (the "system prompt")
// ------------------------------------------------------------
const SYSTEM_PROMPT = `You are Maya, the booking assistant for BrightSmile Dental Clinic in Doha, Qatar.

Clinic facts:
- Services: Check-up & Cleaning (30 min, 250 QAR), Teeth Whitening (60 min, 900 QAR), Filling (45 min, 400 QAR), Emergency / Tooth Pain (seen same-day when possible).
- Hours: Saturday–Thursday 9:00–17:00. Closed Fridays.
- Location: Al Sadd, Doha.

Your job: help the patient choose a service and book an appointment. Be warm, efficient, and human — like the best receptionist they've ever spoken to. Keep replies to 1-3 short sentences.

Rules:
- Always check real availability with your get_available_slots tool before offering times. Never invent times.
- Offer at most 3-4 time options at once, formatted like "Tuesday 8 July, 10:00 AM".
- Before booking you need: full name, phone number, service, and chosen time. Ask for whatever is missing (one thing at a time).
- After booking succeeds, confirm the details back clearly and warmly.
- If asked about pain/emergencies, be empathetic and prioritize the earliest slot.
- You only handle bookings. For medical advice, say the dentist will answer at the appointment.
- Write in plain text only — no markdown, no asterisks, no bullet symbols. The chat window doesn't render formatting.`;

// ------------------------------------------------------------
// Tools: the ONLY actions the AI is allowed to take
// ------------------------------------------------------------
// Each tool has a name, a description (Claude reads this to decide
// when to use it), and a schema describing its inputs.
const tools: Anthropic.Tool[] = [
  {
    name: "get_available_slots",
    description:
      "Get the clinic's real open appointment slots for the next 7 days. Call this before offering any times to a patient.",
    input_schema: { type: "object" as const, properties: {}, required: [] },
  },
  {
    name: "book_appointment",
    description:
      "Book a confirmed appointment. Only call once you have the patient's full name, phone number, service, and their chosen slot.",
    input_schema: {
      type: "object" as const,
      properties: {
        patient_name: { type: "string", description: "Patient's full name" },
        phone: { type: "string", description: "Patient's phone number" },
        service: {
          type: "string",
          description: "One of: Check-up & Cleaning, Teeth Whitening, Filling, Emergency",
        },
        slot_iso: {
          type: "string",
          description: 'The chosen slot in the exact format returned by get_available_slots, e.g. "2026-07-08T10:00"',
        },
      },
      required: ["patient_name", "phone", "service", "slot_iso"],
    },
  },
];

/** Runs the tool Claude asked for and returns the result as a string
 *  (Claude reads this string in the next turn of the loop). */
function executeTool(name: string, input: Record<string, unknown>): string {
  if (name === "get_available_slots") {
    return JSON.stringify({ available_slots: getAvailableSlots(7) });
  }
  if (name === "book_appointment") {
    return JSON.stringify(
      bookAppointment(input as Parameters<typeof bookAppointment>[0])
    );
  }
  return JSON.stringify({ error: `Unknown tool: ${name}` });
}

// ------------------------------------------------------------
// The request handler — runs once per chat message
// ------------------------------------------------------------
export async function POST(req: Request) {
  // The browser sends the whole conversation each time. WHY: the server
  // stays "stateless" — it remembers nothing between requests, so it
  // never gets confused about which patient it's talking to.
  const { messages } = (await req.json()) as {
    messages: { role: "user" | "assistant"; content: string }[];
  };

  const conversation: Anthropic.MessageParam[] = [...messages];

  // THE AGENTIC LOOP: ask Claude → if it wants a tool, run it and feed
  // the result back → repeat until Claude answers in plain text.
  // The loop cap is a seatbelt so a bug can never spin forever.
  for (let turn = 0; turn < 6; turn++) {
    const response = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      tools,
      messages: conversation,
    });

    // Claude is done talking — extract the text and send it to the browser.
    if (response.stop_reason !== "tool_use") {
      const text = response.content
        .filter((block) => block.type === "text")
        .map((block) => (block as Anthropic.TextBlock).text)
        .join("");
      return Response.json({ reply: text });
    }

    // Claude wants to use tool(s). Keep its request in the conversation,
    // run each tool, and append the results — then loop again.
    conversation.push({ role: "assistant", content: response.content });

    const toolResults: Anthropic.ToolResultBlockParam[] = response.content
      .filter((block): block is Anthropic.ToolUseBlock => block.type === "tool_use")
      .map((block) => ({
        type: "tool_result",
        tool_use_id: block.id, // ties this result back to Claude's request
        content: executeTool(block.name, block.input as Record<string, unknown>),
      }));

    conversation.push({ role: "user", content: toolResults });
  }

  return Response.json({
    reply: "Sorry, something went wrong on my end — could you try that again?",
  });
}
