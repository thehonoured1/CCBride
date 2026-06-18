require("dotenv").config();

const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const path = require("path");
const fs = require("fs");
const db = require("./db");
const routes = require("./routes");
const { startScheduler } = require("./scheduler");

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// API routes
app.use("/api", routes);

// Serve React build
const CLIENT_BUILD = path.join(__dirname, "../client/build");
if (fs.existsSync(CLIENT_BUILD)) {
  // Serve static files (JS, CSS, images)
  app.use(express.static(CLIENT_BUILD));

  // For ANY non-API path (including /setup-account, /login, etc.)
  // send back index.html so React Router handles it
  app.use((req, res) => {
    res.sendFile(path.join(CLIENT_BUILD, "index.html"));
  });
} else {
  app.get("/", (req, res) =>
    res.json({
      message: "CCB Rides API running. Build the React client first.",
    }),
  );
}

async function start() {
  await db.getDb();
  console.log("[db] Database ready");
  startScheduler();
  app.listen(PORT, () => {
    const adminCount = db.getAdminCount();
    console.log(`\n⛪  CCB Rides running on http://localhost:${PORT}`);
    console.log(`    API:   http://localhost:${PORT}/api`);
    console.log(
      `    Email: ${process.env.GMAIL_USER ? "✅ " + process.env.GMAIL_USER : "⚠️  Not configured"}`,
    );
    if (adminCount === 0) {
      console.log(`\n    ⚠️  No admin account yet!`);
      console.log(
        `    Visit http://localhost:${PORT} and complete first-time setup.`,
      );
    } else {
      console.log(`    Admin: ✅ Configured`);
    }
  });
}

start().catch((err) => {
  console.error("Failed to start:", err);
  process.exit(1);
});
