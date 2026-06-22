const nodemailer = require("nodemailer");

function getTransporter() {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass)
    throw new Error("GMAIL_USER and GMAIL_APP_PASSWORD not set in .env");
  return nodemailer.createTransport({ service: "gmail", auth: { user, pass } });
}

// ─── Invite email (new rider account setup) ───────────────────────────────────

async function sendInviteEmail(rider, setupUrl) {
  const firstName = rider.name.split(" ")[0];
  const html = `
    <!DOCTYPE html><html><body style="font-family:'Segoe UI',Arial,sans-serif;background:#f4f4f5;margin:0;padding:40px 20px;">
    <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
    <table width="520" cellpadding="0" cellspacing="0"
      style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
      <tr><td style="background:#3d5bdb;padding:28px 36px;">
        <p style="margin:0;font-size:22px;font-weight:700;color:#fff;">🚗 Welcome to RideSync!</p>
      </td></tr>
      <tr><td style="padding:32px 36px;">
        <p style="font-size:16px;color:#111827;margin:0 0 12px;">Hi ${firstName}!</p>
        <p style="font-size:15px;color:#6b7280;line-height:1.6;margin:0 0 24px;">
          You've been added to the RideSync system. Set up your account to start requesting rides.
        </p>
        <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
          <a href="${setupUrl}"
            style="display:inline-block;padding:14px 32px;background:#3d5bdb;color:#fff;
                   text-decoration:none;border-radius:8px;font-size:16px;font-weight:700;">
            Set up my account →
          </a>
        </td></tr></table>
        <p style="font-size:12px;color:#9ca3af;text-align:center;margin-top:20px;">
          This link expires in 7 days. If you didn't expect this email, ignore it.
        </p>
      </td></tr>
    </table>
    </td></tr></table></body></html>
  `;
  await getTransporter().sendMail({
    from: `"RideSync" <${process.env.GMAIL_USER}>`,
    to: rider.email,
    subject: "🚗 Set up your RideSync account",
    html,
  });
}

// ─── Weekly auto-notification ─────────────────────────────────────────────────

async function sendRidePrompt(rider, config) {
  const appUrl = (process.env.APP_URL || "http://localhost:3001").replace(
    /\/$/,
    "",
  );
  const firstName = rider.name.split(" ")[0];
  const yesUrl = `${appUrl}/api/reply?token=${rider.token}&answer=yes`;
  const noUrl = `${appUrl}/api/reply?token=${rider.token}&answer=no`;
  const message =
    config?.message ||
    `Do you want a ride to ${config?.destination || "CCB"} this ${config?.ride_day || "Sunday"}?`;

  const html = `
    <!DOCTYPE html><html><body style="font-family:'Segoe UI',Arial,sans-serif;background:#f4f4f5;margin:0;padding:40px 20px;">
    <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
    <table width="520" cellpadding="0" cellspacing="0"
      style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
      <tr><td style="background:#3d5bdb;padding:28px 36px;">
        <p style="margin:0;font-size:22px;font-weight:700;color:#fff;">🚗 ${config?.destination || "CCB"} Ride</p>
        <p style="margin:6px 0 0;font-size:14px;color:rgba(255,255,255,0.8);">Weekly ride confirmation</p>
      </td></tr>
      <tr><td style="padding:36px 36px 28px;">
        <p style="margin:0 0 12px;font-size:18px;font-weight:600;color:#111827;">Hi ${firstName}! 👋</p>
        <p style="margin:0 0 32px;font-size:16px;color:#6b7280;line-height:1.7;">${message}</p>
        <table width="100%" cellpadding="0" cellspacing="0"><tr>
          <td width="48%" align="center">
            <a href="${yesUrl}" style="display:block;padding:16px 0;background:#16a34a;color:#fff;
               text-decoration:none;border-radius:8px;font-size:16px;font-weight:700;text-align:center;">
              ✅ Yes, please!
            </a>
          </td>
          <td width="4%"></td>
          <td width="48%" align="center">
            <a href="${noUrl}" style="display:block;padding:16px 0;background:#f3f4f6;color:#374151;
               text-decoration:none;border-radius:8px;font-size:16px;font-weight:700;text-align:center;
               border:1px solid #e5e7eb;">
              ❌ No thanks
            </a>
          </td>
        </tr></table>
        <p style="margin:24px 0 0;font-size:12px;color:#9ca3af;text-align:center;">
          You can also log in to your rider portal to raise a custom ride request.
        </p>
      </td></tr>
      <tr><td style="background:#f9fafb;padding:14px 36px;border-top:1px solid #f3f4f6;">
        <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">
          RideSync · Sent automatically by the admin
        </p>
      </td></tr>
    </table>
    </td></tr></table></body></html>
  `;

  await getTransporter().sendMail({
    from: `"RideSync" <${process.env.GMAIL_USER}>`,
    to: rider.email,
    subject: `🚗 ${message}`,
    html,
  });
}

// ─── Approval email to rider ──────────────────────────────────────────────────

async function sendApprovalNotification(
  rider,
  driverName,
  pickupTime,
  pickupAddress,
) {
  const firstName = rider.name.split(" ")[0];
  const html = `
    <!DOCTYPE html><html><body style="font-family:'Segoe UI',Arial,sans-serif;background:#f4f4f5;margin:0;padding:40px 20px;">
    <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
    <table width="520" cellpadding="0" cellspacing="0"
      style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
      <tr><td style="background:#3d5bdb;padding:28px 36px;">
        <p style="margin:0;font-size:22px;font-weight:700;color:#fff;">🚗 Ride confirmed!</p>
      </td></tr>
      <tr><td style="padding:32px 36px;">
        <p style="font-size:16px;color:#111827;margin:0 0 16px;">Hi ${firstName},</p>
        <p style="font-size:15px;color:#6b7280;line-height:1.6;margin:0 0 20px;">Your ride has been confirmed!</p>
        <table width="100%" cellpadding="0" cellspacing="0"
          style="background:#f8faff;border:1px solid #e0e7ff;border-radius:8px;margin-bottom:20px;">
          <tr><td style="padding:16px 20px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding:5px 0;font-size:14px;color:#6b7280;">🧑‍✈️ Driver</td>
                <td style="padding:5px 0;font-size:14px;font-weight:600;color:#111827;text-align:right;">${driverName || "TBD"}</td>
              </tr>
              <tr>
                <td style="padding:5px 0;font-size:14px;color:#6b7280;">🕐 Pickup time</td>
                <td style="padding:5px 0;font-size:14px;font-weight:600;color:#111827;text-align:right;">${pickupTime || "TBD"}</td>
              </tr>
              <tr>
                <td style="padding:5px 0;font-size:14px;color:#6b7280;">📍 Pickup address</td>
                <td style="padding:5px 0;font-size:14px;font-weight:600;color:#111827;text-align:right;">${pickupAddress || "Your registered address"}</td>
              </tr>
            </table>
          </td></tr>
        </table>
        <p style="font-size:14px;color:#9ca3af;margin:0;">See you soon! 🚗</p>
      </td></tr>
    </table>
    </td></tr></table></body></html>
  `;
  await getTransporter().sendMail({
    from: `"RideSync" <${process.env.GMAIL_USER}>`,
    to: rider.email,
    subject: `🚗 Your ride is confirmed — pickup at ${pickupTime || "TBD"}`,
    html,
  });
}

// ─── Assignment email to driver ───────────────────────────────────────────────

async function sendDriverNotification(
  driver,
  rider,
  pickupTime,
  pickupAddress,
  sundayDate,
) {
  const html = `
    <!DOCTYPE html><html><body style="font-family:'Segoe UI',Arial,sans-serif;background:#f4f4f5;margin:0;padding:40px 20px;">
    <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
    <table width="520" cellpadding="0" cellspacing="0"
      style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
      <tr><td style="background:#1e40af;padding:28px 36px;">
        <p style="margin:0;font-size:22px;font-weight:700;color:#fff;">🧑‍✈️ New pickup assignment</p>
        <p style="margin:6px 0 0;font-size:14px;color:rgba(255,255,255,0.8);">${sundayDate}</p>
      </td></tr>
      <tr><td style="padding:32px 36px;">
        <p style="font-size:16px;color:#111827;margin:0 0 16px;">Hi ${driver.name.split(" ")[0]},</p>
        <p style="font-size:15px;color:#6b7280;margin:0 0 20px;">You've been assigned to pick up the following rider:</p>
        <table width="100%" cellpadding="0" cellspacing="0"
          style="background:#f8faff;border:1px solid #e0e7ff;border-radius:8px;margin-bottom:20px;">
          <tr><td style="padding:16px 20px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding:5px 0;font-size:14px;color:#6b7280;">👤 Rider</td>
                <td style="padding:5px 0;font-size:14px;font-weight:600;color:#111827;text-align:right;">${rider?.name || "Unknown"}</td>
              </tr>
              <tr>
                <td style="padding:5px 0;font-size:14px;color:#6b7280;">📞 Phone</td>
                <td style="padding:5px 0;font-size:14px;font-weight:600;color:#111827;text-align:right;">${rider?.phone || "Not provided"}</td>
              </tr>
              <tr>
                <td style="padding:5px 0;font-size:14px;color:#6b7280;">📍 Pickup address</td>
                <td style="padding:5px 0;font-size:14px;font-weight:600;color:#111827;text-align:right;">${pickupAddress || rider?.address || "Not provided"}</td>
              </tr>
              <tr>
                <td style="padding:5px 0;font-size:14px;color:#6b7280;">🕐 Pickup time</td>
                <td style="padding:5px 0;font-size:14px;font-weight:600;color:#111827;text-align:right;">${pickupTime || "TBD"}</td>
              </tr>
            </table>
          </td></tr>
        </table>
      </td></tr>
    </table>
    </td></tr></table></body></html>
  `;
  await getTransporter().sendMail({
    from: `"RideSync" <${process.env.GMAIL_USER}>`,
    to: driver.email,
    subject: `🧑‍✈️ Pickup assignment — ${rider?.name} on ${sundayDate}`,
    html,
  });
}
async function sendAdminInviteEmail(admin, setupUrl) {
  const firstName = admin.name.split(" ")[0];
  const body = [
    '<!DOCTYPE html><html><body style="font-family:Segoe UI,sans-serif;background:#f4f4f5;margin:0;padding:40px 20px;">',
    '<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">',
    '<table width="520" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">',
    '<tr><td style="background:#1e40af;padding:28px 36px;"><p style="margin:0;font-size:22px;font-weight:700;color:#fff;">RideSync - Admin Invite</p></td></tr>',
    '<tr><td style="padding:32px 36px;">',
    '<p style="font-size:16px;color:#111827;margin:0 0 12px;">Hi ' +
      firstName +
      "!</p>",
    '<p style="font-size:15px;color:#6b7280;line-height:1.6;margin:0 0 24px;">You have been invited as an admin. Click below to set up your account.</p>',
    '<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">',
    '<a href="' +
      setupUrl +
      '" style="display:inline-block;padding:14px 32px;background:#1e40af;color:#fff;text-decoration:none;border-radius:8px;font-size:16px;font-weight:700;">Set up admin account</a>',
    "</td></tr></table>",
    '<p style="font-size:12px;color:#9ca3af;text-align:center;margin-top:20px;">This link expires in 7 days.</p>',
    "</td></tr></table></td></tr></table></body></html>",
  ].join("");

  await getTransporter().sendMail({
    from: '"RideSync" <' + process.env.GMAIL_USER + ">",
    to: admin.email,
    subject: "You have been invited to manage RideSync",
    html: body,
  });
}

module.exports = {
  sendInviteEmail,
  sendAdminInviteEmail,
  sendRidePrompt,
  sendApprovalNotification,
  sendDriverNotification,
};