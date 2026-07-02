/**
 * ============================================================
 * app/page.tsx — The booking page patients land on
 * ============================================================
 * WHAT THIS FILE DOES:
 * The public face of the clinic: identity on the left, the live
 * chat (the actual product) on the right. The hero IS the demo —
 * a prospect visiting this page can book an appointment before
 * you finish your pitch.
 * ============================================================
 */

import Chat from "@/components/Chat";

export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-12">
      <div className="grid lg:grid-cols-2 gap-14 items-center max-w-6xl w-full">
        {/* Left: clinic identity + the pitch */}
        <div className="max-w-lg">
          {/* "Eyebrow" — the small label above a headline */}
          <p
            className="mono uppercase tracking-widest text-xs mb-5"
            style={{ color: "var(--teal-deep)" }}
          >
            BrightSmile Dental · Al Sadd, Doha
          </p>

          <h1 className="text-5xl lg:text-6xl leading-[1.05] mb-6">
            Booked before
            <br />
            the kettle boils.
          </h1>

          <p className="text-lg leading-relaxed mb-8" style={{ color: "var(--ink-soft)" }}>
            No phone queue, no callback, no forms. Tell Maya what you need and
            she&apos;ll find you a time — day or night, in one short conversation.
          </p>

          {/* Trust strip: real facts, quietly stated */}
          <div className="flex gap-8">
            {[
              ["Sat–Thu", "9:00–17:00"],
              ["Same-day", "emergencies"],
              ["30 sec", "average booking"],
            ].map(([big, small]) => (
              <div key={big}>
                <div className="font-semibold">{big}</div>
                <div className="text-sm" style={{ color: "var(--ink-soft)" }}>
                  {small}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: the product itself */}
        <Chat />
      </div>
    </main>
  );
}
