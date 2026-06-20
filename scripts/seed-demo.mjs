#!/usr/bin/env node
/**
 * Seeds the Claw demo account with realistic data.
 *
 *   node scripts/seed-demo.mjs
 *
 * Creates services, clients and a spread of appointments so the dashboard,
 * analytics and win-back screens all have something real to show — for
 * screenshots and for the live viva demo.
 *
 * Safe to re-run: it registers the demo account if missing, logs in otherwise,
 * and skips seeding if the account already has clients.
 *
 * Requires the backend running on localhost:3000.
 */

const API = process.env.API_URL || "http://localhost:3000/api";
const EMAIL = "demo.claw.capstone@gmail.com";
const PASSWORD = "claw2026";
const BUSINESS = "Serenity Wellness Studio";

const DAY = 86400000;
const now = new Date();

/** A date N days from today at a given hour, on the hour. */
function at(daysFromNow, hour, minute = 0) {
  const d = new Date(now.getTime() + daysFromNow * DAY);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

let token = null;

async function call(method, path, body) {
  const res = await fetch(API + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { raw: text }; }
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status} ${JSON.stringify(json)}`);
  return json;
}

const SERVICES = [
  { title: "Deep Tissue Massage", duration: 60, price: 1800 },
  { title: "Aromatherapy Facial",  duration: 45, price: 1200 },
  { title: "Hair Spa Treatment",   duration: 90, price: 2500 },
  { title: "Yoga — One to One",    duration: 60, price: 900  },
  { title: "Wellness Consultation", duration: 30, price: 600 },
];

const CLIENTS = [
  { name: "Ananya Iyer",     phone: "9876543210", email: "ananya.iyer@gmail.com",   notes: "Prefers early morning slots. Shoulder tension — avoid deep pressure on left side." },
  { name: "Rohan Deshpande", phone: "9823456781", email: "rohan.d@outlook.com",     notes: "Marathon runner. Books before race weekends." },
  { name: "Meera Nair",      phone: "9945612378", email: "meera.nair@gmail.com",    notes: "Sensitive skin — patch test any new product." },
  { name: "Kabir Sharma",    phone: "9812345670",                                    notes: "Usually reschedules once. Confirm a day ahead." },
  { name: "Priya Venkatesh", phone: "9900112233", email: "priya.v@gmail.com",       notes: "Weekly yoga. Referred by Ananya." },
  { name: "Aditya Rao",      phone: "9765432109",                                    notes: "Lapsed — last visit in June. Worth a win-back message." },
  { name: "Sneha Kulkarni",  phone: "9871209834", email: "sneha.k@gmail.com",       notes: "New enquiry, has not booked yet." },
];

async function main() {
  // --- auth ---
  try {
    const r = await call("POST", "/auth/register", {
      email: EMAIL, password: PASSWORD, businessName: BUSINESS,
    });
    token = r.token;
    console.log(`  registered ${EMAIL}`);
  } catch {
    const r = await call("POST", "/auth/login", { email: EMAIL, password: PASSWORD });
    token = r.token;
    console.log(`  logged in as ${EMAIL}`);
  }

  const existing = await call("GET", "/clients");
  if ((existing.clients || []).length > 0) {
    console.log(`\n  Account already has ${existing.clients.length} clients — nothing to do.`);
    console.log(`  To reseed, delete the clients in the app first.\n`);
    return;
  }

  // --- services ---
  const services = [];
  for (const s of SERVICES) {
    const r = await call("POST", "/services", { ...s, currency: "INR", isActive: true });
    services.push(r.service);
  }
  console.log(`  ${services.length} services`);

  // --- clients ---
  const clients = [];
  for (const c of CLIENTS) {
    const r = await call("POST", "/clients", c);
    clients.push(r.client);
  }
  console.log(`  ${clients.length} clients`);

  const [ananya, rohan, meera, kabir, priya, aditya] = clients;
  const [massage, facial, hairspa, yoga, consult] = services;

  // Appointments: (client, service, daysFromNow, hour, finalStatus)
  // Spread across the last ~7 weeks so analytics, revenue trend and busiest-days
  // all have shape. Times are spaced so conflict detection never rejects a row.
  const PLAN = [
    // --- history: completed, drives revenue + top clients + busiest days ---
    [ananya, massage,  -45, 10, "completed"],
    [aditya, hairspa,  -44, 14, "completed"],   // Aditya's last visit -> inactive
    [rohan,  massage,  -38,  9, "completed"],
    [meera,  facial,   -37, 11, "completed"],
    [ananya, facial,   -31, 10, "completed"],
    [priya,  yoga,     -30,  8, "completed"],
    [rohan,  massage,  -24,  9, "completed"],
    [priya,  yoga,     -23,  8, "completed"],
    [meera,  hairspa,  -22, 15, "completed"],
    [ananya, massage,  -17, 10, "completed"],
    [priya,  yoga,     -16,  8, "completed"],
    [kabir,  consult,  -15, 17, "completed"],
    [rohan,  massage,  -10,  9, "completed"],
    [priya,  yoga,      -9,  8, "completed"],
    [meera,  facial,    -8, 11, "completed"],
    [ananya, hairspa,   -4, 13, "completed"],
    [kabir,  massage,   -3, 16, "cancelled"],   // a cancellation for completion-rate
    [priya,  yoga,      -2,  8, "completed"],

    // --- today: the dashboard agenda ---
    [ananya, massage,    0, 10, "confirmed"],
    [meera,  facial,     0, 12, "confirmed"],
    [rohan,  massage,    0, 15, "pending"],
    [priya,  yoga,       0, 17, "pending"],

    // --- upcoming ---
    [kabir,  consult,    1, 11, "confirmed"],
    [meera,  hairspa,    2, 14, "pending"],
    [ananya, facial,     3, 10, "pending"],
    [priya,  yoga,       4,  8, "confirmed"],
  ];

  let made = 0, statuses = 0;
  for (const [client, service, day, hour, status] of PLAN) {
    let appt;
    try {
      const r = await call("POST", "/appointments", {
        clientId: client.id,
        serviceId: service.id,
        dateTime: at(day, hour),
      });
      appt = r.appointment;
      made++;
    } catch (e) {
      console.log(`    skipped ${client.name} ${day}d @${hour}:00 — ${String(e.message).slice(0, 80)}`);
      continue;
    }
    if (status !== "pending" && appt?.id) {
      await call("PATCH", `/appointments/${appt.id}/status`, { status });
      statuses++;
    }
  }
  console.log(`  ${made} appointments (${statuses} status updates)`);

  const stats = await call("GET", "/appointments/stats");
  const today = await call("GET", "/appointments/today");
  console.log(`\n  Seeded. Sign in on the phone with:`);
  console.log(`    ${EMAIL}  /  ${PASSWORD}`);
  console.log(`\n  This week: ₹${stats.week?.revenue ?? 0} (${stats.week?.count ?? 0})` +
              `   This month: ₹${stats.month?.revenue ?? 0} (${stats.month?.count ?? 0})`);
  console.log(`  Today: ${today.count ?? 0} appointments\n`);
}

main().catch((e) => {
  console.error("\n  seed failed:", e.message);
  console.error("  Is the backend running on localhost:3000?\n");
  process.exit(1);
});
