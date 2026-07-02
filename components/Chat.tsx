/**
 * ============================================================
 * components/Chat.tsx — The conversation window
 * ============================================================
 * WHAT THIS FILE DOES:
 * The live chat card patients type into. It keeps the message
 * list on screen, sends it to our /api/chat endpoint, and shows
 * Maya's reply. All the AI logic lives on the server — this file
 * is purely the experience.
 *
 * CONCEPT: "use client" marks this as a Client Component — code
 * that runs in the patient's browser. It's required for anything
 * interactive (typing, clicking, live updates). Pages without
 * interactivity stay as Server Components, which are faster.
 * ============================================================
 */
"use client";

import { useState, useRef, useEffect } from "react";

// One message in the conversation. "role" tells us who said it.
type Message = { role: "user" | "assistant"; content: string };

// The conversation starters shown as tappable chips before typing.
const QUICK_STARTS = [
  "Book a check-up & cleaning",
  "I have tooth pain",
  "How much is whitening?",
];

export default function Chat() {
  // CONCEPT: "state" is data React watches — when it changes, the
  // screen re-renders automatically. Messages, the input box, and
  // the "thinking" flag are all state.
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hi, I'm Maya — BrightSmile's booking assistant. I can get you an appointment in about 30 seconds. What do you need?",
    },
  ]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to the newest message whenever one arrives.
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, thinking]);

  /** Sends the conversation to the server and appends Maya's reply. */
  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || thinking) return;

    // Show the patient's message instantly — waiting feels broken.
    const next: Message[] = [...messages, { role: "user", content: trimmed }];
    setMessages(next);
    setInput("");
    setThinking(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      const data = await res.json();
      setMessages([...next, { role: "assistant", content: data.reply }]);
    } catch {
      // Network failures happen — tell the patient what to do next.
      setMessages([
        ...next,
        {
          role: "assistant",
          content:
            "I lost connection for a moment — please send that again.",
        },
      ]);
    } finally {
      setThinking(false);
    }
  }

  return (
    <div
      className="flex flex-col w-full overflow-hidden"
      style={{
        background: "var(--card)",
        borderRadius: "var(--radius)",
        border: "1px solid var(--mist)",
        boxShadow: "0 24px 60px -24px rgba(14, 42, 50, 0.25)",
        height: "620px",
      }}
    >
      {/* Header: who you're talking to */}
      <div
        className="flex items-center gap-3 px-5 py-4"
        style={{ borderBottom: "1px solid var(--mist)" }}
      >
        <div className={`orb ${thinking ? "orb--thinking" : ""}`} aria-hidden />
        <div>
          <div className="font-semibold leading-tight">Maya</div>
          <div className="text-sm" style={{ color: "var(--ink-soft)" }}>
            {thinking ? "checking the schedule…" : "online · replies instantly"}
          </div>
        </div>
      </div>

      {/* Message list */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`max-w-[85%] px-4 py-2.5 text-[15px] leading-relaxed whitespace-pre-wrap ${
              m.role === "user" ? "ml-auto" : ""
            }`}
            style={
              m.role === "user"
                ? {
                    background: "var(--ink)",
                    color: "#fff",
                    borderRadius: "16px 16px 4px 16px",
                  }
                : {
                    background: "var(--teal-wash)",
                    borderRadius: "16px 16px 16px 4px",
                  }
            }
          >
            {m.content}
          </div>
        ))}

        {/* Quick-start chips — only before the patient has typed anything */}
        {messages.length === 1 && !thinking && (
          <div className="flex flex-wrap gap-2 pt-2">
            {QUICK_STARTS.map((q) => (
              <button
                key={q}
                onClick={() => send(q)}
                className="px-3.5 py-2 text-sm rounded-full transition-transform hover:scale-[1.03] active:scale-95"
                style={{
                  border: "1px solid var(--teal)",
                  color: "var(--teal-deep)",
                  background: "transparent",
                }}
              >
                {q}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Input bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault(); // CONCEPT: stops the browser's default full-page reload on form submit
          send(input);
        }}
        className="flex gap-2 p-4"
        style={{ borderTop: "1px solid var(--mist)" }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message…"
          aria-label="Message Maya"
          className="flex-1 px-4 py-2.5 text-[15px] rounded-full outline-none"
          style={{ background: "var(--porcelain)", border: "1px solid var(--mist)" }}
        />
        <button
          type="submit"
          disabled={thinking || !input.trim()}
          className="px-5 py-2.5 rounded-full font-medium text-white transition-opacity disabled:opacity-40"
          style={{ background: "var(--teal)" }}
        >
          Send
        </button>
      </form>
    </div>
  );
}
