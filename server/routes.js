const express = require("express");
const router = express.Router();
const db = require("./db");
const {
  hashPassword,
  checkPassword,
  signToken,
  requireAdmin,
  requireRider,
} = require("./auth");
const {
  sendInviteEmail,
  sendAdminInviteEmail,
  sendApprovalNotification,
  sendDriverNotification,
} = require("./notifications");
const { sendWeeklyNotifications, scheduleFromConfig } = require("./scheduler");

// ─── Auth ─────────────────────────────────────────────────────────────────────

// GET /api/status — public endpoint to check setup state
router.get("/status", async (req, res) => {
  try {
    await db.getDb();
    const count = db.getAdminCount();
    res.json({ ok: true, needsSetup: count === 0, adminCount: count });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// POST /api/auth/setup  — create first admin (only works if no admins exist)
router.post("/auth/setup", async (req, res) => {
  try {
    await db.getDb();
    if (db.getAdminCount() > 0)
      return res
        .status(403)
        .json({
          ok: false,
          error: "Admin already exists. Use /auth/admin/login.",
        });
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res
        .status(400)
        .json({ ok: false, error: "name, email and password required" });
    const admin = db.createAdmin({
      name,
      email,
      passwordHash: hashPassword(password),
      accountSetup: 1,
      isSuperAdmin: 1,
    });
    const token = signToken({
      id: admin.id,
      email: admin.email,
      name: admin.name,
      role: "admin",
      isSuperAdmin: 1,
    });
    res.json({
      ok: true,
      token,
      name: admin.name,
      role: "admin",
      isSuperAdmin: 1,
    });
  } catch (e) {
    res.status(400).json({ ok: false, error: e.message });
  }
});

// POST /api/auth/admin/login
router.post("/auth/admin/login", async (req, res) => {
  try {
    await db.getDb();
    const { email, password } = req.body;
    if (!email || !password)
      return res
        .status(400)
        .json({ ok: false, error: "email and password required" });
    const admin = db.getAdminByEmail(email);
    console.log(
      "[login] Admin found:",
      !!admin,
      "| has_password:",
      !!admin?.password_hash,
      "| account_setup:",
      admin?.account_setup,
    );
    if (
      !admin ||
      !admin.password_hash ||
      !checkPassword(password, admin.password_hash)
    )
      return res
        .status(401)
        .json({ ok: false, error: "Invalid email or password" });
    if (!admin.account_setup)
      return res
        .status(403)
        .json({
          ok: false,
          error: "Account not set up yet. Check your invite email.",
        });
    const token = signToken({
      id: admin.id,
      email: admin.email,
      name: admin.name,
      role: "admin",
      isSuperAdmin: admin.is_super_admin === 1,
    });
    res.json({
      ok: true,
      token,
      name: admin.name,
      role: "admin",
      isSuperAdmin: admin.is_super_admin === 1,
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// POST /api/auth/rider/login
router.post("/auth/rider/login", async (req, res) => {
  try {
    await db.getDb();
    const { email, password } = req.body;
    if (!email || !password)
      return res
        .status(400)
        .json({ ok: false, error: "email and password required" });
    const rider = db.getRiderByEmail(email);
    if (!rider)
      return res
        .status(401)
        .json({ ok: false, error: "Invalid email or password" });
    if (!rider.account_setup)
      return res
        .status(403)
        .json({
          ok: false,
          error: "Account not set up yet. Check your invite email.",
        });
    if (!rider.active)
      return res
        .status(403)
        .json({ ok: false, error: "Your account is inactive. Contact admin." });
    if (!checkPassword(password, rider.password_hash))
      return res
        .status(401)
        .json({ ok: false, error: "Invalid email or password" });
    const token = signToken({
      id: rider.id,
      email: rider.email,
      name: rider.name,
      role: "rider",
    });
    res.json({ ok: true, token, name: rider.name, role: "rider" });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// POST /api/auth/setup-account  — rider OR admin sets password via invite link
router.post("/auth/setup-account", async (req, res) => {
  try {
    await db.getDb();
    const { inviteToken, password } = req.body;
    if (!inviteToken || !password)
      return res
        .status(400)
        .json({ ok: false, error: "inviteToken and password required" });
    if (password.length < 6)
      return res
        .status(400)
        .json({ ok: false, error: "Password must be at least 6 characters" });

    // Check rider first, then admin
    const rider = db.getRiderByInviteToken(inviteToken);
    if (rider) {
      db.updateRider(rider.id, {
        password_hash: hashPassword(password),
        account_setup: 1,
        invite_token: null,
      });
      const token = signToken({
        id: rider.id,
        email: rider.email,
        name: rider.name,
        role: "rider",
      });
      return res.json({ ok: true, token, name: rider.name, role: "rider" });
    }

    const admin = db.getAdminByInviteToken(inviteToken);
    if (admin) {
      db.updateAdmin(admin.id, {
        password_hash: hashPassword(password),
        account_setup: 1,
        invite_token: null,
      });
      const token = signToken({
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: "admin",
        isSuperAdmin: admin.is_super_admin === 1,
      });
      return res.json({
        ok: true,
        token,
        name: admin.name,
        role: "admin",
        isSuperAdmin: admin.is_super_admin === 1,
      });
    }

    return res
      .status(400)
      .json({ ok: false, error: "Invalid or expired invite link" });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// GET /api/auth/me
router.get("/auth/me", async (req, res) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token)
    return res.status(401).json({ ok: false, error: "Not authenticated" });
  const { verifyToken } = require("./auth");
  const payload = verifyToken(token);
  if (!payload)
    return res.status(401).json({ ok: false, error: "Invalid token" });

  // Verify user still exists in DB (handles DB reset / deleted accounts)
  await db.getDb();
  if (payload.role === "admin") {
    const admin = db.getAdminByEmail(payload.email);
    if (!admin || !admin.account_setup)
      return res.status(401).json({ ok: false, error: "Account not found" });
  } else if (payload.role === "rider") {
    const rider = db.getRiderByEmail(payload.email);
    if (!rider || !rider.active)
      return res.status(401).json({ ok: false, error: "Account not found" });
  }

  res.json({ ok: true, user: payload });
});

// ─── Admin: Manage admins ─────────────────────────────────────────────────────

router.get("/admins", requireAdmin, async (req, res) => {
  try {
    await db.getDb();
    res.json({ ok: true, admins: db.getAdmins() });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.post("/admins", requireAdmin, async (req, res) => {
  try {
    await db.getDb();
    if (!req.user.isSuperAdmin)
      return res
        .status(403)
        .json({
          ok: false,
          error: "Only the super admin can invite new admins",
        });
    const { name, email } = req.body;
    if (!name || !email)
      return res
        .status(400)
        .json({ ok: false, error: "name and email required" });
    const crypto = require("crypto");
    const inviteToken = crypto.randomBytes(32).toString("hex");
    const admin = db.createAdmin({ name, email, inviteToken, accountSetup: 0 });
    const appUrl = (process.env.APP_URL || "http://localhost:3001").replace(
      /\/$/,
      "",
    );
    const setupUrl = `${appUrl}/setup-account?token=${inviteToken}&role=admin`;
    if (process.env.GMAIL_USER) {
      try {
        await sendAdminInviteEmail(admin, setupUrl);
      } catch (err) {
        console.warn("[api] Admin invite email failed:", err.message);
      }
    }
    res.json({ ok: true, admin, setupUrl });
  } catch (e) {
    const msg = e.message.includes("UNIQUE")
      ? "Email already exists"
      : e.message;
    res.status(400).json({ ok: false, error: msg });
  }
});

router.post("/admins/:id/resend-invite", requireAdmin, async (req, res) => {
  try {
    await db.getDb();
    const crypto = require("crypto");
    const admin = db.getAdmins().find((a) => a.id === Number(req.params.id));
    if (!admin)
      return res.status(404).json({ ok: false, error: "Admin not found" });
    const newToken = crypto.randomBytes(32).toString("hex");
    db.updateAdmin(admin.id, { invite_token: newToken });
    const appUrl = (process.env.APP_URL || "http://localhost:3001").replace(
      /\/$/,
      "",
    );
    const setupUrl = `${appUrl}/setup-account?token=${newToken}&role=admin`;
    if (process.env.GMAIL_USER)
      await sendAdminInviteEmail(
        { ...admin, email: db.getAdminByEmail ? admin.email : admin.email },
        setupUrl,
      );
    res.json({ ok: true, setupUrl });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.delete("/admins/:id", requireAdmin, async (req, res) => {
  try {
    await db.getDb();
    if (!req.user.isSuperAdmin)
      return res
        .status(403)
        .json({ ok: false, error: "Only the super admin can remove admins" });
    if (Number(req.params.id) === req.user.id)
      return res
        .status(400)
        .json({ ok: false, error: "Cannot remove your own account" });
    db.deleteAdmin(Number(req.params.id));
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ─── Admin: Drivers ───────────────────────────────────────────────────────────

router.get("/drivers", requireAdmin, async (req, res) => {
  try {
    await db.getDb();
    res.json({ ok: true, drivers: db.getDrivers() });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.post("/drivers", requireAdmin, async (req, res) => {
  try {
    await db.getDb();
    const { name, email, phone } = req.body;
    if (!name || !email)
      return res
        .status(400)
        .json({ ok: false, error: "name and email required" });
    res.json({ ok: true, driver: db.addDriver({ name, email, phone }) });
  } catch (e) {
    res.status(400).json({ ok: false, error: e.message });
  }
});

router.patch("/drivers/:id", requireAdmin, async (req, res) => {
  try {
    await db.getDb();
    res.json({
      ok: true,
      driver: db.updateDriver(Number(req.params.id), req.body),
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.delete("/drivers/:id", requireAdmin, async (req, res) => {
  try {
    await db.getDb();
    db.deleteDriver(Number(req.params.id));
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ─── Admin: Riders ────────────────────────────────────────────────────────────

router.get("/riders", requireAdmin, async (req, res) => {
  try {
    await db.getDb();
    res.json({ ok: true, riders: db.getRiders() });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.post("/riders", requireAdmin, async (req, res) => {
  try {
    await db.getDb();
    const { name, email, phone, address } = req.body;
    if (!name || !email || !phone || !address)
      return res
        .status(400)
        .json({ ok: false, error: "name, email, phone and address required" });
    const rider = db.addRider({ name, email, phone, address });
    const appUrl = (process.env.APP_URL || "http://localhost:3001").replace(
      /\/$/,
      "",
    );
    const setupUrl = `${appUrl}/setup-account?token=${rider.invite_token}`;
    // Send invite email
    if (process.env.GMAIL_USER) {
      try {
        await sendInviteEmail(rider, setupUrl);
      } catch (err) {
        console.warn("[api] Could not send invite email:", err.message);
      }
    }
    res.json({ ok: true, rider, setupUrl });
  } catch (e) {
    const msg = e.message.includes("UNIQUE")
      ? "Email already exists"
      : e.message;
    res.status(400).json({ ok: false, error: msg });
  }
});

router.patch("/riders/:id", requireAdmin, async (req, res) => {
  try {
    await db.getDb();
    res.json({
      ok: true,
      rider: db.updateRider(Number(req.params.id), req.body),
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.delete("/riders/:id", requireAdmin, async (req, res) => {
  try {
    await db.getDb();
    db.deleteRider(Number(req.params.id));
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// POST /api/riders/:id/resend-invite
router.post("/riders/:id/resend-invite", requireAdmin, async (req, res) => {
  try {
    await db.getDb();
    const crypto = require("crypto");
    const rider = db.getRiderById(Number(req.params.id));
    if (!rider)
      return res.status(404).json({ ok: false, error: "Rider not found" });
    if (rider.account_setup)
      return res
        .status(400)
        .json({ ok: false, error: "Account already set up" });
    const newToken = crypto.randomBytes(32).toString("hex");
    db.updateRider(rider.id, { invite_token: newToken });
    const appUrl = (process.env.APP_URL || "http://localhost:3001").replace(
      /\/$/,
      "",
    );
    const setupUrl = `${appUrl}/setup-account?token=${newToken}`;
    if (process.env.GMAIL_USER)
      await sendInviteEmail({ ...rider, invite_token: newToken }, setupUrl);
    res.json({ ok: true, setupUrl });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ─── Admin: Requests ──────────────────────────────────────────────────────────

router.get("/requests", requireAdmin, async (req, res) => {
  try {
    await db.getDb();
    const { week } = req.query;
    res.json({
      ok: true,
      requests: week ? db.getRequestsForWeek(week) : db.getAllRequests(),
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.get("/requests/current", requireAdmin, async (req, res) => {
  try {
    await db.getDb();
    const week = db.getThisSundayDate();
    res.json({ ok: true, requests: db.getRequestsForWeek(week), week });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.patch("/requests/:id/status", requireAdmin, async (req, res) => {
  try {
    await db.getDb();
    const { status } = req.body;
    if (!["pending", "approved", "declined"].includes(status))
      return res.status(400).json({ ok: false, error: "Invalid status" });
    res.json({
      ok: true,
      request: db.updateRequestStatus(Number(req.params.id), status),
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.post("/requests/:id/assign", requireAdmin, async (req, res) => {
  try {
    await db.getDb();
    const { driverId, pickupTime, pickupAddress } = req.body;
    if (!driverId || !pickupTime || !pickupAddress)
      return res
        .status(400)
        .json({
          ok: false,
          error: "driverId, pickupTime and pickupAddress required",
        });
    const request = db.assignDriver(
      Number(req.params.id),
      Number(driverId),
      pickupTime,
      pickupAddress,
    );
    if (process.env.GMAIL_USER) {
      const rider = db.getRiders().find((r) => r.id === request.rider_id);
      const driver = db.getDrivers().find((d) => d.id === Number(driverId));
      const sunday = db.getThisSundayDate();
      if (rider?.email) {
        try {
          await sendApprovalNotification(
            rider,
            driver?.name,
            pickupTime,
            pickupAddress,
          );
        } catch (err) {
          console.warn("[api] Rider email failed:", err.message);
        }
      }
      if (driver?.email) {
        try {
          await sendDriverNotification(
            driver,
            rider,
            pickupTime,
            pickupAddress,
            sunday,
          );
        } catch (err) {
          console.warn("[api] Driver email failed:", err.message);
        }
      }
    }
    res.json({ ok: true, request });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.delete("/requests/:id", requireAdmin, async (req, res) => {
  try {
    await db.getDb();
    db.run("DELETE FROM ride_requests WHERE id = ?", [Number(req.params.id)]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ─── Admin: Notification config ───────────────────────────────────────────────

router.get("/notify/config", requireAdmin, async (req, res) => {
  try {
    await db.getDb();
    res.json({ ok: true, config: db.getNotificationConfig() });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.patch("/notify/config", requireAdmin, async (req, res) => {
  try {
    await db.getDb();
    const config = db.updateNotificationConfig(req.body);
    await scheduleFromConfig(); // restart cron with new settings
    res.json({ ok: true, config });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.post("/notify", requireAdmin, async (req, res) => {
  try {
    await db.getDb();
    res.json({ ok: true, ...(await sendWeeklyNotifications()) });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.get("/notify/log", requireAdmin, async (req, res) => {
  try {
    await db.getDb();
    res.json({ ok: true, log: db.getNotificationLog() });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ─── Admin: Stats ─────────────────────────────────────────────────────────────

router.get("/stats", requireAdmin, async (req, res) => {
  try {
    await db.getDb();
    const week = db.getThisSundayDate();
    const riders = db.getRiders();
    const drivers = db.getDrivers();
    const thisWeek = db.getRequestsForWeek(week);
    const log = db.getNotificationLog();
    const config = db.getNotificationConfig();
    res.json({
      ok: true,
      stats: {
        totalRiders: riders.length,
        activeRiders: riders.filter((r) => r.active).length,
        totalDrivers: drivers.length,
        activeDrivers: drivers.filter((d) => d.active).length,
        thisWeek: {
          date: week,
          total: thisWeek.length,
          pending: thisWeek.filter((r) => r.status === "pending").length,
          approved: thisWeek.filter((r) => r.status === "approved").length,
          declined: thisWeek.filter((r) => r.status === "declined").length,
        },
        lastNotification: log[0] || null,
        notificationConfig: config,
      },
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ─── Email reply webhook (YES/NO from notification email) ─────────────────────

router.get("/reply", async (req, res) => {
  try {
    await db.getDb();
    const { token, answer } = req.query;
    if (!token || !answer)
      return res.send(
        htmlPage("❌ Invalid link", "Missing required info.", "#dc2626"),
      );
    const rider = db.getRiderByToken(token);
    if (!rider)
      return res.send(
        htmlPage("❌ Unknown rider", "This link is not registered.", "#dc2626"),
      );
    if (!rider.active)
      return res.send(
        htmlPage(
          "⚠️ Inactive",
          "Your account is inactive. Contact admin.",
          "#d97706",
        ),
      );
    const week = db.getThisSundayDate();
    const config = db.getNotificationConfig();
    const dest = config?.destination || "CCB";
    if (answer === "yes") {
      db.createRequest({
        riderId: rider.id,
        weekDate: week,
        destination: dest,
        type: "auto",
      });
      console.log(`[reply] ${rider.name} said YES`);
      return res.send(
        htmlPage(
          "✅ You're on the list!",
          `Hi ${rider.name.split(" ")[0]}! Your ride request has been received. The driver will be assigned soon.`,
          "#16a34a",
        ),
      );
    } else if (answer === "no") {
      return res.send(
        htmlPage(
          "👋 See you next week!",
          `No problem! You won't be on the list this week. ⛪`,
          "#6b7280",
        ),
      );
    }
    return res.send(
      htmlPage(
        "❓ Unknown",
        "Please use the YES or NO buttons in the email.",
        "#d97706",
      ),
    );
  } catch (e) {
    res.send(htmlPage("❌ Error", e.message, "#dc2626"));
  }
});

function htmlPage(title, message, color) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${title}</title><style>*{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Segoe UI',Arial,sans-serif;background:#f4f4f5;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}
  .card{background:#fff;border-radius:16px;padding:48px 40px;max-width:460px;width:100%;text-align:center;box-shadow:0 4px 24px rgba(0,0,0,0.08)}
  .icon{font-size:48px;margin-bottom:16px} h1{font-size:24px;font-weight:700;color:${color};margin-bottom:14px}
  p{font-size:16px;color:#6b7280;line-height:1.6} .close{margin-top:28px;font-size:13px;color:#9ca3af}
  </style></head><body><div class="card">
  <div class="icon">${title.split(" ")[0]}</div>
  <h1>${title.split(" ").slice(1).join(" ")}</h1>
  <p>${message}</p><p class="close">You can close this tab now.</p>
  </div></body></html>`;
}

// ─── Rider portal API ─────────────────────────────────────────────────────────

// GET /api/rider/me
router.get("/rider/me", requireRider, async (req, res) => {
  try {
    await db.getDb();
    const rider = db.getRiderById(req.user.id);
    if (!rider)
      return res.status(404).json({ ok: false, error: "Rider not found" });
    const { password_hash, token, invite_token, ...safe } = rider;
    res.json({ ok: true, rider: safe });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// GET /api/rider/requests — rider's own requests
router.get("/rider/requests", requireRider, async (req, res) => {
  try {
    await db.getDb();
    res.json({ ok: true, requests: db.getRequestsForRider(req.user.id) });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// POST /api/rider/requests — raise a custom ride request
router.post("/rider/requests", requireRider, async (req, res) => {
  try {
    await db.getDb();
    const { destination, rideDate, rideTime, notes } = req.body;
    if (!destination || !rideDate || !rideTime)
      return res
        .status(400)
        .json({
          ok: false,
          error: "destination, rideDate and rideTime are required",
        });
    const weekDate = rideDate; // use ride date as week key for custom requests
    const request = db.createRequest({
      riderId: req.user.id,
      weekDate,
      destination,
      type: "custom",
      rideDate,
      rideTime,
      notes,
    });
    res.json({ ok: true, request });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// DELETE /api/rider/requests/:id — rider cancels their own request
router.delete("/rider/requests/:id", requireRider, async (req, res) => {
  try {
    await db.getDb();
    const req2 = db
      .getAllRequests()
      .find((r) => r.id === Number(req.params.id));
    if (!req2 || req2.rider_id !== req.user.id)
      return res.status(403).json({ ok: false, error: "Not your request" });
    if (req2.status === "approved")
      return res
        .status(400)
        .json({ ok: false, error: "Cannot cancel an approved request" });
    db.run("DELETE FROM ride_requests WHERE id = ?", [Number(req.params.id)]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

module.exports = router;
