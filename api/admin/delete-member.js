const admin = require("firebase-admin");

function initAdmin() {
  if (admin.apps.length) return admin.app();

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY
    ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n")
    : null;

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error("Missing Firebase Admin environment variables.");
  }

  return admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });
}

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 1_000_000) reject(new Error("Payload too large"));
    });
    req.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on("error", reject);
  });
}

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

function getAllowedAdminEmails() {
  const fromEnv = String(process.env.TEAM_ADMIN_EMAILS || "")
    .split(",")
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);

  if (fromEnv.length) return new Set(fromEnv);

  return new Set([
    "blk911@gmail.com",
    "admin@vmb.com",
    "admin@venmebaby.com",
  ]);
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return json(res, 405, { ok: false, error: "method_not_allowed" });
  }

  try {
    initAdmin();
  } catch (err) {
    return json(res, 503, { ok: false, error: "admin_not_configured", detail: String(err.message || err) });
  }

  const authz = req.headers.authorization || "";
  const token = authz.startsWith("Bearer ") ? authz.slice(7) : "";
  if (!token) return json(res, 401, { ok: false, error: "missing_auth_token" });

  const auth = admin.auth();
  const db = admin.firestore();

  let decoded;
  try {
    decoded = await auth.verifyIdToken(token);
  } catch (err) {
    return json(res, 401, { ok: false, error: "invalid_auth_token", detail: String(err.message || err) });
  }

  const callerEmail = String(decoded.email || "").toLowerCase();
  const allowedAdmins = getAllowedAdminEmails();
  if (!callerEmail || !allowedAdmins.has(callerEmail)) {
    return json(res, 403, { ok: false, error: "not_authorized" });
  }

  let body;
  try {
    body = await parseJsonBody(req);
  } catch {
    return json(res, 400, { ok: false, error: "invalid_json" });
  }

  const memberId = String(body.memberId || "").trim();
  if (!memberId) return json(res, 400, { ok: false, error: "member_id_required" });

  if (memberId === "admin" || memberId === "jsw") {
    return json(res, 409, { ok: false, error: "protected_member", memberId });
  }

  const ref = db.collection("teamMembers").doc(memberId);
  let snap;
  try {
    snap = await ref.get();
  } catch (err) {
    return json(res, 500, { ok: false, error: "member_read_failed", detail: String(err.message || err), memberId });
  }

  if (!snap.exists) {
    return json(res, 404, { ok: false, error: "member_not_found", memberId });
  }

  try {
    await ref.delete();
  } catch (err) {
    return json(res, 500, { ok: false, error: "member_delete_failed", detail: String(err.message || err), memberId });
  }

  return json(res, 200, {
    ok: true,
    deletedPath: "teamMembers/" + memberId,
    memberId,
    email: snap.get("email") || null,
    name: snap.get("name") || null,
    deletedBy: callerEmail,
  });
};
