require("dotenv").config();

const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const routes = require("./routes");

const app = express();

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// API routes
app.use("/api", routes);

// Export the app for Vercel's serverless environment
module.exports = app;

// Keep local dev working (only runs if you test locally using `node index.js`)
if (require.main === module) {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log(`\n⛪ CCB Rides API running locally on http://localhost:${PORT}/api`);
  });
}