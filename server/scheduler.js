const cron = require("node-cron");
const db = require("./db");
const { sendRidePrompt } = require("./notifications");

let currentTask = null;

function startScheduler() {
  scheduleFromConfig();
}

async function scheduleFromConfig() {
  // Stop any existing cron task
  if (currentTask) {
    currentTask.stop();
    currentTask = null;
  }

  await db.getDb();
  const config = await db.getNotificationConfig(); // <-- ADDED AWAIT
  if (!config || !config.enabled) {
    console.log("[scheduler] Notifications disabled — cron not started");
    return;
  }

  const schedule = config.cron_schedule || "0 17 * * 4";
  const tz = process.env.TZ || "America/New_York";
  console.log(`[scheduler] Cron scheduled: "${schedule}" (${tz})`);

  currentTask = cron.schedule(
    schedule,
    async () => {
      console.log("[scheduler] Firing ride notification…");
      await sendWeeklyNotifications();
    },
    { timezone: tz },
  );
}

async function sendWeeklyNotifications() {
  await db.getDb();
  const config = await db.getNotificationConfig(); // <-- ADDED AWAIT
  const sunday = db.getThisSundayDate(); // Math only, no await needed
  const riders = await db.getRiders(true); // <-- ADDED AWAIT

  if (riders.length === 0) {
    console.log("[scheduler] No active riders — skipping.");
    return { sent: 0, sunday, results: [] };
  }

  const results = [];
  for (const rider of riders) {
    try {
      if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
        console.log(
          `[scheduler] [DEMO] Would email ${rider.name} (${rider.email})`,
        );
        results.push({ rider: rider.name, status: "demo" });
        continue;
      }
      await sendRidePrompt(rider, config);
      console.log(`[scheduler] Sent to ${rider.name}`);
      results.push({ rider: rider.name, status: "sent" });
    } catch (err) {
      console.error(`[scheduler] Failed for ${rider.name}:`, err.message);
      results.push({ rider: rider.name, status: "error", error: err.message });
    }
  }

  await db.logNotification(sunday, riders.length); // <-- ADDED AWAIT
  return {
    sent: results.filter((r) => r.status === "sent").length,
    sunday,
    results,
  };
}

module.exports = {
  startScheduler,
  scheduleFromConfig,
  sendWeeklyNotifications,
};