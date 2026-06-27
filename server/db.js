const crypto = require("crypto");
const { createClient } = require("@supabase/supabase-js");

// 1. Initialize Supabase Client
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.warn("⚠️ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env");
}

const supabase = createClient(SUPABASE_URL || "", SUPABASE_SERVICE_KEY || "");

// 2. Legacy Shims (To prevent routes.js/index.js from crashing)
async function getDb() {
  return supabase;
}

function save() {
  // No-op: Supabase saves to the cloud instantly
}

async function run(sql, params = []) {
  // Shim for the raw DELETE query inside routes.js
  if (sql.includes("DELETE FROM ride_requests")) {
    await supabase.from("ride_requests").delete().eq("id", params[0]);
  }
}

// ─── Admin ────────────────────────────────────────────────────────────

async function getAdminByEmail(email) {
  const { data } = await supabase.from("admins").select("*").eq("email", email.toLowerCase()).maybeSingle();
  return data;
}

async function getAdminCount() {
  const { count, error } = await supabase.from("admins").select("*", { count: "exact", head: true });
  
  // Force the server to tell us if the table doesn't exist
  if (error) throw new Error("Database Error in getAdminCount: " + error.message);
  
  return count || 0;
}

async function createAdmin({ name, email, passwordHash = null, inviteToken = null, accountSetup = 0, isSuperAdmin = 0 }) {
  const { data, error } = await supabase.from("admins").insert([{
    name: name.trim(),
    email: email.trim().toLowerCase(),
    password_hash: passwordHash,
    invite_token: inviteToken,
    account_setup: accountSetup,
    is_super_admin: isSuperAdmin
  }]).select().single();

  // Force the server to tell us exactly why the insert was rejected
  if (error) throw new Error("Database Error in createAdmin: " + error.message);

  return data;
}

async function getAdmins() {
  const { data } = await supabase.from("admins").select("id, name, email, account_setup, is_super_admin, created_at").order("created_at", { ascending: true });
  return data || [];
}

async function getAdminByInviteToken(token) {
  const { data } = await supabase.from("admins").select("*").eq("invite_token", token).maybeSingle();
  return data;
}

async function updateAdmin(id, fields) {
  const allowed = ["name", "email", "password_hash", "invite_token", "account_setup"];
  const f = {};
  for (const k of allowed) if (fields[k] !== undefined) f[k] = fields[k];
  
  const { data } = await supabase.from("admins").update(f).eq("id", id).select().single();
  return data;
}

async function deleteAdmin(id) {
  await supabase.from("admins").delete().eq("id", id);
}

async function getAdminCount() {
  const { count } = await supabase.from("admins").select("*", { count: "exact", head: true });
  return count || 0;
}

// ─── Drivers ──────────────────────────────────────────────────────────

async function getDrivers(activeOnly = false) {
  let query = supabase.from("drivers").select("*").order("name", { ascending: true });
  if (activeOnly) query = query.eq("active", 1);
  
  const { data } = await query;
  return data || [];
}

async function getDriverById(id) {
  const { data } = await supabase.from("drivers").select("*").eq("id", id).maybeSingle();
  return data;
}

async function getDriverByEmail(email) {
  const { data } = await supabase.from("drivers").select("*").eq("email", email.toLowerCase()).maybeSingle();
  return data;
}

async function getDriverByInviteToken(token) {
  const { data } = await supabase.from("drivers").select("*").eq("invite_token", token).maybeSingle();
  return data;
}

async function addDriver({ name, email = "", phone = "" }) {
  const inviteToken = crypto.randomBytes(32).toString("hex");
  const { data } = await supabase.from("drivers").insert([{
    name: name.trim(),
    email: email.trim().toLowerCase(),
    phone: phone.trim(),
    invite_token: inviteToken
  }]).select().single();
  return data;
}

async function updateDriver(id, fields) {
  const allowed = ["name", "email", "phone", "active", "password_hash", "invite_token", "account_setup", "capacity", "availability_status", "availability_message"];
  const f = {};
  for (const k of allowed) if (fields[k] !== undefined) f[k] = fields[k];
  
  const { data } = await supabase.from("drivers").update(f).eq("id", id).select().single();
  return data;
}

async function deleteDriver(id) {
  await supabase.from("drivers").delete().eq("id", id);
}

// ─── Riders ───────────────────────────────────────────────────────────

async function getRiders(activeOnly = false) {
  let query = supabase.from("riders").select("*").order("name", { ascending: true });
  if (activeOnly) query = query.eq("active", 1);
  
  const { data } = await query;
  return data || [];
}

async function getRiderById(id) {
  const { data } = await supabase.from("riders").select("*").eq("id", id).maybeSingle();
  return data;
}

async function getRiderByEmail(email) {
  const { data } = await supabase.from("riders").select("*").eq("email", email.toLowerCase()).maybeSingle();
  return data;
}

async function getRiderByToken(token) {
  const { data } = await supabase.from("riders").select("*").eq("token", token).maybeSingle();
  return data;
}

async function getRiderByInviteToken(token) {
  const { data } = await supabase.from("riders").select("*").eq("invite_token", token).maybeSingle();
  return data;
}

async function addRider({ name, email, phone = "", address }) {
  const token = crypto.randomBytes(24).toString("hex");
  const inviteToken = crypto.randomBytes(32).toString("hex");
  
  const { data } = await supabase.from("riders").insert([{
    name: name.trim(),
    email: email.trim().toLowerCase(),
    phone: phone.trim(),
    address: address.trim(),
    token: token,
    invite_token: inviteToken
  }]).select().single();
  return data;
}

async function updateRider(id, fields) {
  const allowed = ["name", "email", "phone", "address", "active", "password_hash", "account_setup", "invite_token"];
  const f = {};
  for (const k of allowed) if (fields[k] !== undefined) f[k] = fields[k];
  
  const { data } = await supabase.from("riders").update(f).eq("id", id).select().single();
  return data;
}

async function deleteRider(id) {
  await supabase.from("riders").delete().eq("id", id);
}

// ─── Ride Requests ────────────────────────────────────────────────────

// Helper to flatten PostgreSQL relational joins into the flat object the frontend expects
function flattenRequest(r) {
  const flat = { ...r };
  if (r.riders) {
    flat.rider_name = r.riders.name;
    flat.rider_email = r.riders.email;
    flat.rider_address = r.riders.address;
    flat.rider_phone = r.riders.phone;
  }
  if (r.drivers) {
    flat.driver_name = r.drivers.name;
    flat.driver_phone = r.drivers.phone;
  }
  delete flat.riders;
  delete flat.drivers;
  return flat;
}

async function getRequestsForWeek(weekDate) {
  const { data } = await supabase
    .from("ride_requests")
    .select(`*, riders:rider_id (name, email, address, phone), drivers:driver_id (name)`)
    .eq("week_date", weekDate)
    .order("responded_at", { ascending: true });
  
  return (data || []).map(flattenRequest);
}

async function getAllRequests() {
  const { data } = await supabase
    .from("ride_requests")
    .select(`*, riders:rider_id (name, email), drivers:driver_id (name)`)
    .order("week_date", { ascending: false })
    .order("responded_at", { ascending: true });
  
  return (data || []).map(flattenRequest);
}

async function getRequestsForRider(riderId) {
  const { data } = await supabase
    .from("ride_requests")
    .select(`*, drivers:driver_id (name, phone)`)
    .eq("rider_id", riderId)
    .order("responded_at", { ascending: false });
  
  return (data || []).map(flattenRequest);
}

async function getRequestsForDriver(driverId, weekDate) {
  const { data } = await supabase
    .from("ride_requests")
    .select(`*, riders:rider_id (name, email, phone, address)`)
    .eq("driver_id", driverId)
    .eq("week_date", weekDate)
    .order("pickup_time", { ascending: true });
  
  return (data || []).map(flattenRequest);
}

async function createRequest({ riderId, weekDate, destination = "CCB", type = "auto", rideDate = null, rideTime = null, notes = null }) {
  // Upsert handles the INSERT OR IGNORE behavior
  const { data } = await supabase.from("ride_requests").upsert({
    rider_id: riderId,
    week_date: weekDate,
    destination: destination,
    type: type,
    ride_date: rideDate,
    ride_time: rideTime,
    notes: notes,
    responded_at: new Date().toISOString()
  }, { onConflict: "rider_id, week_date, destination", ignoreDuplicates: true }).select().single();
  
  return data;
}

async function updateRequestStatus(id, status) {
  const { data } = await supabase.from("ride_requests").update({ status }).eq("id", id).select().single();
  return data;
}

async function assignDriver(requestId, driverId, pickupTime, pickupAddress) {
  await supabase.from("ride_requests").update({
    driver_id: driverId || null,
    pickup_time: pickupTime || null,
    pickup_address: pickupAddress || null,
    status: "approved"
  }).eq("id", requestId);
  
  const { data } = await supabase
    .from("ride_requests")
    .select(`*, riders:rider_id (name, email, phone), drivers:driver_id (name)`)
    .eq("id", requestId)
    .single();
    
  return flattenRequest(data);
}

// ─── Notification Config ──────────────────────────────────────────────

async function getNotificationConfig() {
  const { data } = await supabase.from("notification_config").select("*").order("id", { ascending: false }).limit(1).maybeSingle();
  return data;
}

async function updateNotificationConfig(fields) {
  const allowed = ["enabled", "cron_schedule", "destination", "ride_day", "message"];
  const f = {};
  for (const k of allowed) if (fields[k] !== undefined) f[k] = fields[k];
  f.updated_at = new Date().toISOString();
  
  const { data } = await supabase.from("notification_config").update(f).eq("id", 1).select().single();
  return data;
}

// ─── Notification Log ─────────────────────────────────────────────────

async function logNotification(weekDate, riderCount) {
  await supabase.from("notification_log").insert([{
    week_date: weekDate,
    rider_count: riderCount
  }]);
}

async function getNotificationLog() {
  const { data } = await supabase.from("notification_log").select("*").order("sent_at", { ascending: false }).limit(20);
  return data || [];
}

// ─── Utility ──────────────────────────────────────────────────────────

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
  getDriverById,
  getDriverByEmail,
  getDriverByInviteToken,
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
  getRequestsForDriver,
  createRequest,
  updateRequestStatus,
  assignDriver,
  getNotificationConfig,
  updateNotificationConfig,
  logNotification,
  getNotificationLog,
  getThisSundayDate,
};