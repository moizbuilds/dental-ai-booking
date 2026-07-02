/**
 * ============================================================
 * app/admin/page.tsx — The clinic's appointment dashboard
 * ============================================================
 * WHAT THIS FILE DOES:
 * The staff-facing view: every appointment Maya has booked,
 * soonest first. In a real deployment this would sit behind a
 * login — for the demo it's open at /admin.
 *
 * CONCEPT: this is a Server Component (no "use client" at the
 * top). It runs on the server, reads the database directly, and
 * ships finished HTML to the browser. No API call needed — that's
 * why there's no fetch() here, unlike Chat.tsx.
 * ============================================================
 */

import { getAllAppointments } from "@/lib/db";

// Tell Next.js to re-read the database on every visit instead of
// caching the page — staff always see the latest bookings.
export const dynamic = "force-dynamic";

/** Turns "2026-07-08T10:00" into "Tue 8 Jul · 10:00" for humans. */
function formatSlot(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }) + " · " + d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

export default function AdminPage() {
  const appointments = getAllAppointments();

  return (
    <main className="min-h-screen px-6 py-12 max-w-4xl mx-auto">
      <p
        className="mono uppercase tracking-widest text-xs mb-3"
        style={{ color: "var(--teal-deep)" }}
      >
        BrightSmile Dental · Staff
      </p>
      <h1 className="text-4xl mb-2">Appointments</h1>
      <p className="mb-10" style={{ color: "var(--ink-soft)" }}>
        {appointments.length === 0
          ? "Nothing booked yet — Maya is standing by."
          : `${appointments.length} booked via Maya`}
      </p>

      {/* Each appointment is one card. A table would also work, but
          cards read better on the phone a clinic manager actually uses. */}
      <div className="space-y-3">
        {appointments.map((a) => (
          <div
            key={a.id}
            className="flex flex-wrap items-center gap-x-6 gap-y-1 px-5 py-4"
            style={{
              background: "var(--card)",
              border: "1px solid var(--mist)",
              borderRadius: "14px",
            }}
          >
            <span className="mono font-medium" style={{ color: "var(--teal-deep)" }}>
              {formatSlot(a.slot_iso)}
            </span>
            <span className="font-semibold">{a.patient_name}</span>
            <span style={{ color: "var(--ink-soft)" }}>{a.service}</span>
            <span className="mono ml-auto" style={{ color: "var(--ink-soft)" }}>
              {a.phone}
            </span>
          </div>
        ))}
      </div>
    </main>
  );
}
