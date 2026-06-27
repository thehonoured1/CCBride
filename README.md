# 🚗 RideSync

A full-stack ride coordination platform with an admin dashboard, rider portal, automated email notifications, and JWT-based authentication.

Built for coordinating recurring group rides — admins manage riders and drivers, riders can request rides, and the system automatically notifies riders on a configurable schedule.

---

## Features

### Authentication
- **Super admin** — created on first launch via a setup page. Has full access including inviting/removing other admins
- **Regular admins** — invited by the super admin via email. Can manage everything except admin accounts
- **Riders** — added by admins and sent an invite email to set up their account with a password
- **Drivers** — added by admins and sent an invite email to set up their account with a password
- JWT-based sessions (7-day expiry) with automatic sign-out if account is removed
- Periodic session validation — removed users are kicked out within 60 seconds even if idle

### Admin dashboard
- **Ride requests** — view all responses for the current week, assign drivers with pickup time and address, approve or decline
- **Riders** — add, edit, remove riders; toggle active status; resend invite emails
- **Drivers** — add, edit, remove drivers; toggle active status; resend invite emails; view driver availability status, optional messages, and seat capacities
- **History** — all past ride requests grouped by week with notification log
- **Notifications** — configure auto-notification schedule (day + time picker), custom message, enable/disable
- **Admins** — super admin can invite new admins and remove existing ones

### Rider portal
- Riders log in with their own credentials
- Can raise **custom ride requests** (any destination, date, time, notes)
- Can also respond to automatic Thursday notifications via YES/NO email buttons
- Can view and cancel their own pending requests
- See assigned driver, pickup time, and pickup address once approved

### Driver portal
- Drivers log in with their own credentials
- Can toggle availability status for the current week
- Can adjust car seat capacity at any time
- Can submit an optional short text message to the admin regarding availability
- Can view assigned riders and their pickup addresses/times for the current week

### Automatic notifications
- Configurable schedule (day of week + time) set from the admin dashboard
- Sends a "Do you want a ride?" email to all active riders
- Riders click YES or NO in the email — no login required
- YES creates a ride request automatically
- Admin receives no action needed — just reviews and assigns drivers

### Email notifications
- **Rider invite** — sent when admin adds a new rider with account setup link
- **Admin invite** — sent when super admin invites a new admin
- **Ride prompt** — weekly notification to all active riders (auto or manual)
- **Approval** — sent to rider when driver is assigned (includes driver name, pickup time, pickup address)
- **Driver assignment** — sent to driver when assigned to a rider (includes rider name, phone, pickup address)
- All emails sent via Gmail SMTP (free, no third-party service needed)

---

## Tech stack

| Layer | Tech |
|---|---|
| Backend | Node.js + Express |
| Database | SQLite (via sql.js — no native build required) |
| Auth | bcryptjs + jsonwebtoken |
| Scheduler | node-cron |
| Email | Nodemailer + Gmail SMTP |
| Frontend | React 18 |

---

## Project structure

```
ridesync/
├── server/
│   ├── index.js          — Express entry point, serves React build
│   ├── auth.js           — bcrypt + JWT helpers + Express middleware
│   ├── db.js             — SQLite schema, migrations, all query functions
│   ├── routes.js         — All API endpoints (auth, admin, rider portal, webhook)
│   ├── scheduler.js      — node-cron job, reads config from DB, restartable
│   └── notifications.js  — All email templates (invite, prompt, approval, driver)
├── client/
│   ├── src/
│   │   ├── App.js        — Full React app (login, admin dashboard, rider portal)
│   │   ├── api.js        — API client with global 401 handler
│   │   ├── index.css     — All styles (dark theme, auth pages, tables, modals)
│   │   └── index.js      — React entry point
│   └── public/
│       └── index.html
├── data/
│   └── ridesync.db       — SQLite database (auto-created on first run)
├── package.json
└── .env
```

---

## Setup

### 1. Install dependencies

```bat
npm install
cd client && npm install && cd ..
```

### 2. Configure environment

```bat
copy .env.example .env
notepad .env
```

Fill in the following:

```env
PORT=3001
APP_URL=http://localhost:3001
JWT_SECRET=your-long-random-secret-here

GMAIL_USER=yourname@gmail.com
GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx

TZ=America/New_York
```

**Getting a Gmail App Password:**
1. Go to [myaccount.google.com/security](https://myaccount.google.com/security)
2. Enable **2-Step Verification**
3. Go to [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
4. Create one for "Mail" and paste the 16-character password above

### 3. Build the frontend

**Restore folder structure first (Windows):**
```bat
mkdir client\src
mkdir client\public
rename client-src src
move src client\
rename client-public public
move public client\
move client-package.json client\package.json
```

**Then build:**
```bat
cd client && npm run build && cd ..
```

### 4. Start the server

```bat
npm start
```

Open **http://localhost:3001** — you'll see the first-time setup page to create your super admin account.

---

## First-time setup

1. Open `http://localhost:3001`
2. Fill in your name, email and password to create the **super admin** account
3. Add drivers in the **Drivers** tab — each driver gets an invite email automatically
4. Add riders in the **Riders** tab — each rider gets an invite email automatically
5. Riders and drivers click the link in their email, set a password, and can log in at `http://localhost:3001`
6. Configure the notification schedule in the **Notifications** tab
7. Every week, riders get an email — they click YES or NO, and ride requests appear in the dashboard
8. Assign a driver to each request — rider and driver both get confirmation emails

---

## API reference

### Auth (public)
| Method | Path | Description |
|---|---|---|
| GET | `/api/status` | Check if admin account exists |
| POST | `/api/auth/setup` | Create first super admin (one-time) |
| POST | `/api/auth/admin/login` | Admin login |
| POST | `/api/auth/rider/login` | Rider login |
| POST | `/api/auth/driver/login` | Driver login |
| POST | `/api/auth/setup-account` | Set password via invite token (rider, driver, or admin) |
| GET | `/api/auth/me` | Validate current session |

### Admin (requires admin JWT)
| Method | Path | Description |
|---|---|---|
| GET | `/api/admins` | List all admins |
| POST | `/api/admins` | Invite new admin (super admin only) |
| POST | `/api/admins/:id/resend-invite` | Resend admin invite |
| DELETE | `/api/admins/:id` | Remove admin (super admin only) |
| GET/POST | `/api/riders` | List / add riders |
| PATCH/DELETE | `/api/riders/:id` | Update / remove rider |
| POST | `/api/riders/:id/resend-invite` | Resend rider invite |
| GET/POST | `/api/drivers` | List / add drivers |
| PATCH/DELETE | `/api/drivers/:id` | Update / remove driver |
| POST | `/api/drivers/:id/resend-invite` | Resend driver invite |
| GET | `/api/requests/current` | This week's ride requests |
| GET | `/api/requests` | All ride requests |
| PATCH | `/api/requests/:id/status` | Update request status |
| POST | `/api/requests/:id/assign` | Assign driver + pickup details |
| DELETE | `/api/requests/:id` | Delete request |
| POST | `/api/notify` | Manually trigger notifications |
| GET | `/api/notify/log` | Notification history |
| GET/PATCH | `/api/notify/config` | Get / update notification config |
| GET | `/api/stats` | Dashboard summary stats |

### Rider portal (requires rider JWT)
| Method | Path | Description |
|---|---|---|
| GET | `/api/rider/me` | Get own profile |
| GET | `/api/rider/requests` | Get own ride requests |
| POST | `/api/rider/requests` | Create custom ride request |
| DELETE | `/api/rider/requests/:id` | Cancel own pending request |

### Driver portal (requires driver JWT)
| Method | Path | Description |
|---|---|---|
| GET | `/api/driver/dashboard` | Get driver dashboard data & assigned riders |
| POST | `/api/driver/status` | Update driver availability, message, capacity |

### Email webhook (public)
| Method | Path | Description |
|---|---|---|
| GET | `/api/reply?token=...&answer=yes\|no` | YES/NO response from notification email |

---

## Database schema

```
admins           — id, name, email, password_hash, invite_token, account_setup, is_super_admin
riders           — id, name, email, phone, address, password_hash, invite_token, token, account_setup, active
drivers          — id, name, email, phone, active, password_hash, invite_token, account_setup, capacity, availability_status, availability_message
ride_requests    — id, rider_id, week_date, destination, type, ride_date, ride_time, notes,
                   status, driver_id, pickup_time, pickup_address, responded_at
notification_config — id, enabled, cron_schedule, destination, ride_day, message
notification_log    — id, week_date, sent_at, rider_count
```

---

## Deployment

Push to GitHub and deploy to any Node.js host (Railway, Render, Fly.io):

- **Build command:** `npm install && cd client && npm install && npm run build`
- **Start command:** `npm start`
- Set all `.env` variables in your host's environment settings
- Update `APP_URL` to your production domain

---

## Development mode

Run backend and frontend separately with hot reload:

```bat
:: Terminal 1 — backend
npm run dev

:: Terminal 2 — frontend (in client folder)
cd client && npm start
```

Frontend dev server at `http://localhost:3000`, proxies API calls to `:3001`.

---

## Testing & URL Configuration Note

Depending on whether you are testing locally or testing on a live server, ensure your URLs are configured correctly:

- **Local Testing (Development)**:
  - Access the application via `http://localhost:3000` (development server with hot reload) or `http://localhost:3001` (locally run server).
  - Ensure the `.env` file has: `APP_URL=http://localhost:3001`.
  - Invitation and setup links sent via email will point to `http://localhost:3001/setup-account?token=...`.

- **Live/Production Testing**:
  - Access the application via your live domain, e.g., `https://<your-production-url>.com` (or `https://your-app.up.railway.app`).
  - Ensure your hosting provider's environment variables (config vars) have `APP_URL` set to `https://<your-production-url>.com`.
  - Invitation and setup links sent via email will automatically point to `https://<your-production-url>.com/setup-account?token=...`.
