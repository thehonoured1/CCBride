const BASE = process.env.REACT_APP_API_URL || "";

function getToken() {
  return localStorage.getItem("ccb_token");
}
function getRole() {
  return localStorage.getItem("ccb_role");
}

async function request(method, path, body, auth = true) {
  const headers = { "Content-Type": "application/json" };
  if (auth) {
    const t = getToken();
    if (t) headers["Authorization"] = `Bearer ${t}`;
  }
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE}/api${path}`, opts);
  const data = await res.json();

  // If the server says our token is invalid or account is gone, sign out immediately
  if ((res.status === 401 || res.status === 403) && auth) {
    const isAuthError =
      data.error &&
      (data.error.includes("not authenticated") ||
        data.error.includes("Invalid token") ||
        data.error.includes("Account not found") ||
        data.error.includes("not found"));
    if (isAuthError) {
      localStorage.removeItem("ccb_token");
      localStorage.removeItem("ccb_role");
      localStorage.removeItem("ccb_name");
      window.location.reload(); // reload sends them to login page
    }
  }

  if (!data.ok) throw new Error(data.error || "Request failed");
  return data;
}

export const api = {
  // Setup check
  checkAdminExists: async () => {
    const res = await fetch("/api/status");
    const data = await res.json();
    return { exists: !data.needsSetup };
  },

  // Auth
  setupAdmin: (b) => request("POST", "/auth/setup", b, false),
  adminLogin: (b) => request("POST", "/auth/admin/login", b, false),
  riderLogin: (b) => request("POST", "/auth/rider/login", b, false),
  driverLogin: (b) => request("POST", "/auth/driver/login", b, false),
  setupAccount: (b) => request("POST", "/auth/setup-account", b, false),
  getMe: () => request("GET", "/auth/me"),

  // Admin management
  getAdmins: () => request("GET", "/admins"),
  addAdmin: (b) => request("POST", "/admins", b),
  resendAdminInvite: (id) => request("POST", `/admins/${id}/resend-invite`),
  deleteAdmin: (id) => request("DELETE", `/admins/${id}`),
  updateAdminRole: (id, isSuperAdmin) => request("PUT", `/admins/${id}/role`, { isSuperAdmin }),

  // Admin
  getStats: () => request("GET", "/stats"),
  getDrivers: () => request("GET", "/drivers"),
  addDriver: (b) => request("POST", "/drivers", b),
  updateDriver: (id, b) => request("PATCH", `/drivers/${id}`, b),
  deleteDriver: (id) => request("DELETE", `/drivers/${id}`),
  getRiders: () => request("GET", "/riders"),
  addRider: (b) => request("POST", "/riders", b),
  updateRider: (id, b) => request("PATCH", `/riders/${id}`, b),
  deleteRider: (id) => request("DELETE", `/riders/${id}`),
  resendInvite: (id) => request("POST", `/riders/${id}/resend-invite`),
  resendDriverInvite: (id) => request("POST", `/drivers/${id}/resend-invite`),
  resendSetup: (id) => request("POST", `/riders/${id}/resend-invite`),
  getCurrentRequests: () => request("GET", "/requests/current"),
  getAllRequests: () => request("GET", "/requests"),
  updateStatus: (id, status) =>
    request("PATCH", `/requests/${id}/status`, { status }),
  assignDriver: (id, b) => request("POST", `/requests/${id}/assign`, b),
  deleteRequest: (id) => request("DELETE", `/requests/${id}`),
  sendNotification: () => request("POST", "/notify"),
  getNotifyLog: () => request("GET", "/notify/log"),
  getNotifyConfig: () => request("GET", "/notify/config"),
  updateNotifyConfig: (b) => request("PATCH", "/notify/config", b),

  // Rider portal
  getRiderMe: () => request("GET", "/rider/me"),
  getRiderRequests: () => request("GET", "/rider/requests"),
  createRideRequest: (b) => request("POST", "/rider/requests", b),
  createRiderRequest: (b) => request("POST", "/rider/requests", b),
  cancelRequest: (id) => request("DELETE", `/rider/requests/${id}`),
  cancelRiderRequest: (id) => request("DELETE", `/rider/requests/${id}`),

  // Driver portal
  getDriverDashboard: () => request("GET", "/driver/dashboard"),
  updateDriverStatus: (b) => request("POST", "/driver/status", b),

  // Helpers
  getToken,
  getRole,
  saveSession: (token, role, name) => {
    localStorage.setItem("ccb_token", token);
    localStorage.setItem("ccb_role", role);
    localStorage.setItem("ccb_name", name);
  },
  clearSession: () => {
    localStorage.removeItem("ccb_token");
    localStorage.removeItem("ccb_role");
    localStorage.removeItem("ccb_name");
  },
  getName: () => localStorage.getItem("ccb_name") || "",
};