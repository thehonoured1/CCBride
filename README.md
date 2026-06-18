# 🚗 Ride Coordinator

A Thursday ride notification system with an admin dashboard.
Riders get an automatic SMS/WhatsApp every Thursday at 5 PM asking if they want a ride.
Whoever replies YES gets a ride request created automatically.
The admin approves or declines from the dashboard.

---

## Stack

| Layer       | Tech |
|-------------|------|
| Backend     | Node.js + Express |
| Database    | SQLite (via sql.js, no native build needed) |
| Scheduler   | node-cron (Thursday 5 PM) |
| Messaging   | Twilio SMS or WhatsApp |
| Frontend    | React (served by Express in production) |

---

## Quick start

### 1. Install dependencies

```bash
npm install
cd client && npm install && cd ..
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and fill in your Twilio credentials:

```
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_FROM_NUMBER=+15550001234
RIDE_TIME=6:00 PM
RIDE_DESTINATION=the Downtown Office
TZ=America/New_York
```

> **No Twilio yet?** The app runs in **demo mode** — all features work except actual SMS sending. You'll see "[DEMO]" in the server logs.

### 3. Build the frontend

```bash
cd client && npm run build && cd ..
```

### 4. Start the server

```bash
npm start
```

Open **http://localhost:3001** — the admin dashboard is ready.

---

## Development mode

Run the backend and frontend separately with hot reload:

```bash
# Terminal 1 — backend (install nodemon first: npm i -g nodemon)
npm run dev

# Terminal 2 — frontend dev server
cd client && npm start
```

Frontend dev server → http://localhost:3000 (proxies API to :3001)

---

## Twilio setup

### SMS (simplest)
1. Create a [Twilio account](https://twilio.com)
2. Buy a phone number
3. Set `TWILIO_FROM_NUMBER=+1XXXXXXXXXX`
4. Set `USE_WHATSAPP=false`

### WhatsApp
1. Enable the [Twilio WhatsApp Sandbox](https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn)
2. Set `TWILIO_FROM_NUMBER=+14155238886` (sandbox number)
3. Set `USE_WHATSAPP=true`
4. Each rider must send a sandbox join message once

### Inbound webhook
In your Twilio console, point **"A message comes in"** to:
```
https://your-domain.com/api/webhook/twilio
```
Method: `HTTP POST`

For local testing, use [ngrok](https://ngrok.com):
```bash
ngrok http 3001
# Use the https URL as your Twilio webhook
```

---

## API reference

| Method | Path | Description |
|--------|------|-------------|
| GET    | `/api/riders` | List all riders |
| POST   | `/api/riders` | Add a rider `{ name, phone, email }` |
| PATCH  | `/api/riders/:id` | Update rider fields |
| DELETE | `/api/riders/:id` | Remove a rider |
| GET    | `/api/requests/current` | This week's requests |
| GET    | `/api/requests` | All requests (all weeks) |
| PATCH  | `/api/requests/:id/status` | `{ status: "approved"\|"declined"\|"pending" }` |
| DELETE | `/api/requests/:id` | Remove a request |
| POST   | `/api/notify` | Manually trigger notifications |
| GET    | `/api/notify/log` | Notification history |
| GET    | `/api/stats` | Dashboard summary stats |
| POST   | `/api/webhook/twilio` | Twilio inbound message webhook |

---

## Deployment (Railway / Render / Fly.io)

1. Push to GitHub
2. Create a new service pointing to the repo
3. Set all env vars from `.env.example`
4. Build command: `npm install && cd client && npm install && npm run build`
5. Start command: `npm start`
6. Update Twilio webhook URL to your production domain

---

## File structure

```
rideshare/
├── server/
│   ├── index.js          # Express entry point
│   ├── db.js             # SQLite database layer
│   ├── routes.js         # All API routes
│   ├── scheduler.js      # node-cron Thursday 5pm job
│   └── notifications.js  # Twilio SMS/WhatsApp helpers
├── client/
│   ├── src/
│   │   ├── App.js        # Full admin dashboard UI
│   │   ├── api.js        # API client
│   │   ├── index.js      # React entry
│   │   └── index.css     # All styles
│   └── public/
│       └── index.html
├── data/                 # SQLite DB file (auto-created)
├── .env.example          # Environment template
└── README.md
```
