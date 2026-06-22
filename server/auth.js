const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "change-this-secret-in-production";
const JWT_EXPIRY = "7d";

function hashPassword(plain) {
  return bcrypt.hashSync(plain, 10);
}

function checkPassword(plain, hash) {
  return bcrypt.compareSync(plain, hash);
}

function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

// ─── Express middleware ───────────────────────────────────────────────────────

function requireAdmin(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token)
    return res.status(401).json({ ok: false, error: "Not authenticated" });
  const payload = verifyToken(token);
  if (!payload || payload.role !== "admin")
    return res.status(403).json({ ok: false, error: "Admin access required" });
  req.user = payload;
  next();
}

function requireRider(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token)
    return res.status(401).json({ ok: false, error: "Not authenticated" });
  const payload = verifyToken(token);
  if (!payload || payload.role !== "rider")
    return res.status(403).json({ ok: false, error: "Rider access required" });
  req.user = payload;
  next();
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token)
    return res.status(401).json({ ok: false, error: "Not authenticated" });
  const payload = verifyToken(token);
  if (!payload)
    return res.status(401).json({ ok: false, error: "Invalid token" });
  req.user = payload;
  next();
}

module.exports = {
  hashPassword,
  checkPassword,
  signToken,
  verifyToken,
  requireAdmin,
  requireRider,
  requireAuth,
};