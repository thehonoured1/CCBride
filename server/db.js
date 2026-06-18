const path = require("path");
const fs = require("fs");
const initSqlJs = require("../node_modules/sql.js");
const crypto = require("crypto");

const DB_PATH = path.join(__dirname, "../data/rideshare.db");
let db;

async function getDb() {
  if (db) return db;
  const SQL = await initSqlJs();
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (fs.existsSync(DB_PATH)) {
    db = new SQL.Database(fs.readFileSync(DB_PATH));
  } else {
    db = new SQL.Database();
  }
  migrate();
  save();
  return db;
}

function save() {
  fs.writeFileSync(DB_PATH, Buffer.from(db.export()));
}

function migrate() {
  // Admin accounts
  db.run(`
    CREATE TABLE IF NOT EXISTS admins (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      name          TEXT NOT NULL,
      email         TEXT NOT NULL UNIQUE,
      password_hash TEXT,
      invite_token     TEXT UNIQUE,
      account_setup    INTEGER DEFAULT 0,
      is_super_admin   INTEGER DEFAULT 0,
      created_at       TEXT
    )
  `);

  // Drivers
  db.run(`
    CREATE TABLE IF NOT EXISTS drivers (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT NOT NULL,
      email      TEXT,
      phone      TEXT,
      active     INTEGER DEFAULT 1,
      created_at TEXT
    )
  `);

  // Riders — with login credentials and invite flow
  db.run(`
    CREATE TABLE IF NOT EXISTS riders (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      name          TEXT NOT NULL,
      email         TEXT NOT NULL UNIQUE,
      phone         TEXT,
      address       TEXT NOT NULL,
      password_hash TEXT,
      invite_token  TEXT UNIQUE,      -- used in setup-account link
      token         TEXT NOT NULL UNIQUE,  -- used in email YES/NO links
      account_setup INTEGER DEFAULT 0,    -- 0=pending, 1=done
      active        INTEGER DEFAULT 1,
      created_at    TEXT
    )
  `);

  // Ride requests — both auto (from notifications) and manual (from rider portal)
  db.run(`
    CREATE TABLE IF NOT EXISTS ride_requests (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      rider_id       INTEGER NOT NULL,
      week_date      TEXT NOT NULL,
      destination    TEXT DEFAULT 'CCB',
      ride_date      TEXT,            -- specific date rider wants (for custom requests)
      ride_time      TEXT,            -- desired ride time from rider
      notes          TEXT,            -- any notes from rider
      type           TEXT DEFAULT 'auto',  -- 'auto' | 'custom'
      status         TEXT DEFAULT 'pending',
      driver_id      INTEGER,
      pickup_time    TEXT,
      pickup_address TEXT,
      responded_at   TEXT,
      FOREIGN KEY (rider_id)  REFERENCES riders(id)  ON DELETE CASCADE,
      FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE SET NULL,
      UNIQUE(rider_id, week_date, destination)
    )
  `);

  // Notification schedule config (set by admin)
  db.run(`
    CREATE TABLE IF NOT EXISTS notification_config (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      enabled       INTEGER DEFAULT 1,
      cron_schedule TEXT DEFAULT '0 17 * * 4',
      destination   TEXT DEFAULT 'CCB',
      ride_day      TEXT DEFAULT 'Sunday',
      message       TEXT DEFAULT 'Do you want a ride to CCB this Sunday?',
      updated_at    TEXT
    )
  `);

  // Insert default config if not exists
  const existing = get("SELECT id FROM notification_config LIMIT 1");
  if (!existing) {
    db.run(`INSERT INTO notification_config (updated_at) VALUES (?)`, [
      new Date().toISOString(),
    ]);
  }

  // Notification log
  db.run(`
    CREATE TABLE IF NOT EXISTS notification_log (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      week_date   TEXT NOT NULL,
      sent_at     TEXT,
      rider_count INTEGER
    )
  `);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function all(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

function get(sql, params = []) {
  return all(sql, params)[0] || null;
}
function run(sql, params = []) {
  db.run(sql, params);
  save();
}

// ─── Admin ────────────────────────────────────────────────────────────────────

function getAdminByEmail(email) {
  return get("SELECT * FROM admins WHERE email = ?", [email.toLowerCase()]);
}

function createAdmin({
  name,
  email,
  passwordHash = null,
  inviteToken = null,
  accountSetup = 0,
  isSuperAdmin = 0,
}) {
  const now = new Date().toISOString();
  run(
    "INSERT INTO admins (name, email, password_hash, invite_token, account_setup, is_super_admin, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [
      name.trim(),
      email.trim().toLowerCase(),
      passwordHash,
      inviteToken,
      accountSetup,
      isSuperAdmin,
      now,
    ],
  );
  return get("SELECT * FROM admins WHERE email = ?", [email.toLowerCase()]);
}

function getAdmins() {
  return all(
    "SELECT id, name, email, account_setup, is_super_admin, created_at FROM admins ORDER BY created_at ASC",
  );
}

function getAdminByInviteToken(token) {
  return get("SELECT * FROM admins WHERE invite_token = ?", [token]);
}

function updateAdmin(id, fields) {
  const allowed = [
    "name",
    "email",
    "password_hash",
    "invite_token",
    "account_setup",
  ];
  const f = {};
  for (const k of allowed) if (fields[k] !== undefined) f[k] = fields[k];
  const sets = Object.keys(f)
    .map((k) => `${k} = ?`)
    .join(", ");
  run(`UPDATE admins SET ${sets} WHERE id = ?`, [...Object.values(f), id]);
  return get("SELECT * FROM admins WHERE id = ?", [id]);
}

function deleteAdmin(id) {
  run("DELETE FROM admins WHERE id = ?", [id]);
}

function getAdminCount() {
  return (get("SELECT COUNT(*) as c FROM admins") || {}).c || 0;
}

// ─── Drivers ─────────────────────────────────────────────────────────────────

function getDrivers(activeOnly = false) {
  const where = activeOnly ? "WHERE active = 1" : "";
  return all(`SELECT * FROM drivers ${where} ORDER BY name ASC`);
}

function addDriver({ name, email = "", phone = "" }) {
  const now = new Date().toISOString();
  run(
    "INSERT INTO drivers (name, email, phone, created_at) VALUES (?, ?, ?, ?)",
    [name.trim(), email.trim().toLowerCase(), phone.trim(), now],
  );
  return get("SELECT * FROM drivers ORDER BY id DESC LIMIT 1");
}

function updateDriver(id, fields) {
  const allowed = ["name", "email", "phone", "active"];
  const f = {};
  for (const k of allowed) if (fields[k] !== undefined) f[k] = fields[k];
  const sets = Object.keys(f)
    .map((k) => `${k} = ?`)
    .join(", ");
  run(`UPDATE drivers SET ${sets} WHERE id = ?`, [...Object.values(f), id]);
  return get("SELECT * FROM drivers WHERE id = ?", [id]);
}

function deleteDriver(id) {
  run("DELETE FROM drivers WHERE id = ?", [id]);
}

// ─── Riders ──────────────────────────────────────────────────────────────────

function getRiders(activeOnly = false) {
  const where = activeOnly ? "WHERE active = 1" : "";
  return all(`SELECT * FROM riders ${where} ORDER BY name ASC`);
}

function getRiderById(id) {
  return get("SELECT * FROM riders WHERE id = ?", [id]);
}
function getRiderByEmail(email) {
  return get("SELECT * FROM riders WHERE email = ?", [email.toLowerCase()]);
}
function getRiderByToken(token) {
  return get("SELECT * FROM riders WHERE token = ?", [token]);
}
function getRiderByInviteToken(token) {
  return get("SELECT * FROM riders WHERE invite_token = ?", [token]);
}

function addRider({ name, email, phone = "", address }) {
  const token = crypto.randomBytes(24).toString("hex");
  const inviteToken = crypto.randomBytes(32).toString("hex");
  const now = new Date().toISOString();
  run(
    "INSERT INTO riders (name, email, phone, address, token, invite_token, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [
      name.trim(),
      email.trim().toLowerCase(),
      phone.trim(),
      address.trim(),
      token,
      inviteToken,
      now,
    ],
  );
  return get("SELECT * FROM riders WHERE token = ?", [token]);
}

function updateRider(id, fields) {
  const allowed = [
    "name",
    "email",
    "phone",
    "address",
    "active",
    "password_hash",
    "account_setup",
    "invite_token",
  ];
  const f = {};
  for (const k of allowed) if (fields[k] !== undefined) f[k] = fields[k];
  const sets = Object.keys(f)
    .map((k) => `${k} = ?`)
    .join(", ");
  run(`UPDATE riders SET ${sets} WHERE id = ?`, [...Object.values(f), id]);
  return get("SELECT * FROM riders WHERE id = ?", [id]);
}

function deleteRider(id) {
  run("DELETE FROM riders WHERE id = ?", [id]);
}

// ─── Ride requests ────────────────────────────────────────────────────────────

function getRequestsForWeek(weekDate) {
  return all(
    `
    SELECT rr.*, r.name AS rider_name, r.email AS rider_email, r.address AS rider_address, r.phone AS rider_phone,
           d.name AS driver_name
    FROM ride_requests rr
    JOIN riders r  ON r.id = rr.rider_id
    LEFT JOIN drivers d ON d.id = rr.driver_id
    WHERE rr.week_date = ?
    ORDER BY rr.responded_at ASC
  `,
    [weekDate],
  );
}

function getAllRequests() {
  return all(`
    SELECT rr.*, r.name AS rider_name, r.email AS rider_email,
           d.name AS driver_name
    FROM ride_requests rr
    JOIN riders r  ON r.id = rr.rider_id
    LEFT JOIN drivers d ON d.id = rr.driver_id
    ORDER BY rr.week_date DESC, rr.responded_at ASC
  `);
}

function getRequestsForRider(riderId) {
  return all(
    `
    SELECT rr.*, d.name AS driver_name, d.phone AS driver_phone
    FROM ride_requests rr
    LEFT JOIN drivers d ON d.id = rr.driver_id
    WHERE rr.rider_id = ?
    ORDER BY rr.responded_at DESC
  `,
    [riderId],
  );
}

function createRequest({
  riderId,
  weekDate,
  destination = "CCB",
  type = "auto",
  rideDate = null,
  rideTime = null,
  notes = null,
}) {
  const now = new Date().toISOString();
  run(
    `INSERT OR IGNORE INTO ride_requests
       (rider_id, week_date, destination, type, ride_date, ride_time, notes, responded_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [riderId, weekDate, destination, type, rideDate, rideTime, notes, now],
  );
  return get(
    `SELECT rr.* FROM ride_requests rr WHERE rr.rider_id = ? AND rr.week_date = ? AND rr.destination = ?`,
    [riderId, weekDate, destination],
  );
}

function updateRequestStatus(id, status) {
  run("UPDATE ride_requests SET status = ? WHERE id = ?", [status, id]);
  return get("SELECT * FROM ride_requests WHERE id = ?", [id]);
}

function assignDriver(requestId, driverId, pickupTime, pickupAddress) {
  run(
    "UPDATE ride_requests SET driver_id = ?, pickup_time = ?, pickup_address = ?, status = ? WHERE id = ?",
    [
      driverId || null,
      pickupTime || null,
      pickupAddress || null,
      "approved",
      requestId,
    ],
  );
  return get(
    `
    SELECT rr.*, r.name AS rider_name, r.email AS rider_email, r.phone AS rider_phone,
           d.name AS driver_name
    FROM ride_requests rr
    JOIN riders r  ON r.id = rr.rider_id
    LEFT JOIN drivers d ON d.id = rr.driver_id
    WHERE rr.id = ?
  `,
    [requestId],
  );
}

// ─── Notification config ──────────────────────────────────────────────────────

function getNotificationConfig() {
  return get("SELECT * FROM notification_config ORDER BY id DESC LIMIT 1");
}

function updateNotificationConfig(fields) {
  const allowed = [
    "enabled",
    "cron_schedule",
    "destination",
    "ride_day",
    "message",
  ];
  const f = {};
  for (const k of allowed) if (fields[k] !== undefined) f[k] = fields[k];
  f.updated_at = new Date().toISOString();
  const sets = Object.keys(f)
    .map((k) => `${k} = ?`)
    .join(", ");
  run(`UPDATE notification_config SET ${sets} WHERE id = 1`, Object.values(f));
  return getNotificationConfig();
}

// ─── Notification log ─────────────────────────────────────────────────────────

function logNotification(weekDate, riderCount) {
  const now = new Date().toISOString();
  run(
    "INSERT INTO notification_log (week_date, sent_at, rider_count) VALUES (?, ?, ?)",
    [weekDate, now, riderCount],
  );
}

function getNotificationLog() {
  return all("SELECT * FROM notification_log ORDER BY sent_at DESC LIMIT 20");
}

// ─── Utility ─────────────────────────────────────────────────────────────────

function getThisSundayDate() {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? 0 : 7 - day;
  const sun = new Date(now);
  sun.setDate(now.getDate() + diff);
  const y = sun.getFullYear();
  const m = String(sun.getMonth() + 1).padStart(2, "0");
  const d = String(sun.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

module.exports = {
  getDb,
  save,
  run,
  getAdminByEmail,
  createAdmin,
  getAdminCount,
  getAdmins,
  getAdminByInviteToken,
  updateAdmin,
  deleteAdmin,
  getDrivers,
  addDriver,
  updateDriver,
  deleteDriver,
  getRiders,
  getRiderById,
  getRiderByEmail,
  getRiderByToken,
  getRiderByInviteToken,
  addRider,
  updateRider,
  deleteRider,
  getRequestsForWeek,
  getAllRequests,
  getRequestsForRider,
  createRequest,
  updateRequestStatus,
  assignDriver,
  getNotificationConfig,
  updateNotificationConfig,
  logNotification,
  getNotificationLog,
  getThisSundayDate,
};
