/**
 * ============================================================
 * lib/db.ts — The clinic's database
 * ============================================================
 * WHAT THIS FILE DOES:
 * Everything that touches stored data lives here: creating the
 * database, generating open appointment slots, and booking them.
 * The rest of the app never talks to SQLite directly — it calls
 * the functions exported from this file.
 *
 * WHY THIS PATTERN (the "data layer"):
 * If we sprinkled SQL queries all over the app, changing the
 * database later (say, to Postgres for a real client) would mean
 * hunting through every file. Keeping it in ONE file means we
 * only ever change one file. The naive alternative — writing SQL
 * inside UI components — works at first but rots fast.
 * ============================================================
 */

import Database from "better-sqlite3";
import path from "path";

// CONCEPT: SQLite is a database that lives in a single file on disk —
// no server to install. Perfect for demos and small clinic deployments.
const db = new Database(path.join(process.cwd(), "clinic.db"));

// Create the appointments table the first time the app runs.
// "IF NOT EXISTS" makes this safe to run on every startup.
db.exec(`
  CREATE TABLE IF NOT EXISTS appointments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    service TEXT NOT NULL,
    slot_iso TEXT NOT NULL UNIQUE,   -- e.g. "2026-07-03T10:00" (UNIQUE = no double-booking)
    status TEXT NOT NULL DEFAULT 'confirmed',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

/** The shape of one appointment row. Exporting the type means every
 *  file that handles appointments agrees on what one looks like. */
export type Appointment = {
  id: number;
  patient_name: string;
  phone: string;
  service: string;
  slot_iso: string;
  status: string;
  created_at: string;
};

// ------------------------------------------------------------
// Clinic schedule rules (this is what you'd customize per client)
// ------------------------------------------------------------
const OPEN_HOUR = 9; // 9:00 AM
const CLOSE_HOUR = 17; // last slot starts 4:00 PM
const CLOSED_DAY = 5; // Friday (JS counts days Sun=0 ... Sat=6) — Qatar work week

/**
 * getAvailableSlots — returns open slots for the next `days` days.
 *
 * HOW IT WORKS: we don't store empty slots in the database. Instead we
 * generate every possible slot from the schedule rules, then remove the
 * ones already booked. WHY: storing thousands of empty rows just to
 * mark a few as "taken" is the naive approach — generating on demand
 * means the schedule rules live in code where they're easy to change.
 */
export function getAvailableSlots(days = 7): string[] {
  const booked = new Set(
    db
      .prepare("SELECT slot_iso FROM appointments WHERE status != 'cancelled'")
      .all()
      .map((r) => (r as { slot_iso: string }).slot_iso)
  );

  const slots: string[] = [];
  const now = new Date();

  for (let d = 0; d < days; d++) {
    const day = new Date(now);
    day.setDate(now.getDate() + d);
    if (day.getDay() === CLOSED_DAY) continue; // skip Fridays

    for (let h = OPEN_HOUR; h < CLOSE_HOUR; h++) {
      const slot = new Date(day);
      slot.setHours(h, 0, 0, 0);
      if (slot <= now) continue; // never offer slots in the past

      // Build "2026-07-03T10:00" manually so it stays in local clinic
      // time (toISOString() would convert to UTC and shift the hour).
      const iso = `${slot.getFullYear()}-${String(slot.getMonth() + 1).padStart(2, "0")}-${String(
        slot.getDate()
      ).padStart(2, "0")}T${String(h).padStart(2, "0")}:00`;

      if (!booked.has(iso)) slots.push(iso);
    }
  }
  return slots;
}

/**
 * bookAppointment — writes a confirmed booking, or explains why it can't.
 *
 * WHY RETURN {ok, error} INSTEAD OF THROWING: the AI receptionist reads
 * this result and relays it to the patient ("that slot was just taken").
 * A structured result is something the AI can act on; a crash is not.
 */
export function bookAppointment(input: {
  patient_name: string;
  phone: string;
  service: string;
  slot_iso: string;
}): { ok: boolean; error?: string; appointment?: Appointment } {
  // Validate against live availability — the slot must still be open.
  if (!getAvailableSlots(14).includes(input.slot_iso)) {
    return { ok: false, error: "That slot is no longer available." };
  }

  // CONCEPT: "prepared statements" with ? placeholders let the database
  // safely insert user text. NEVER build SQL by gluing strings together —
  // that's how SQL-injection attacks happen.
  const result = db
    .prepare(
      "INSERT INTO appointments (patient_name, phone, service, slot_iso) VALUES (?, ?, ?, ?)"
    )
    .run(input.patient_name, input.phone, input.service, input.slot_iso);

  const appointment = db
    .prepare("SELECT * FROM appointments WHERE id = ?")
    .get(result.lastInsertRowid) as Appointment;

  return { ok: true, appointment };
}

/** getAllAppointments — everything for the admin dashboard, soonest first. */
export function getAllAppointments(): Appointment[] {
  return db
    .prepare("SELECT * FROM appointments ORDER BY slot_iso ASC")
    .all() as Appointment[];
}
