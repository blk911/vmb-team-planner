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
      if (raw.length > 1_000_000) {
        reject(new Error("Payload too large"));
      }
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

function slug(name) {
  return String(name || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "") || "member";
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeId(value) {
  return String(value || "").trim().toLowerCase();
}

function getKnownCanonicalMemberIdByEmail(email) {
  const normalized = normalizeEmail(email);
  if (!normalized) return "";
  const map = {
    "admin@vmb.com": "admin",
    "admin@venmebaby.com": "admin",
    "blk911@gmail.com": "jsw",
    "oreo12798@gmail.com": "katie",
    "taylormanaya@gmail.com": "taylor",
  };
  return map[normalized] || "";
}

function scoreMemberDoc(snap, ctx) {
  if (!snap || !snap.exists) return -1;
  const data = snap.data() || {};
  const docId = normalizeId(snap.id);
  const workspaceId = normalizeId(data.workspaceId || data.id || "");
  const email = normalizeEmail(data.email || "");
  let score = 0;
  if (ctx.knownId && docId === ctx.knownId) score += 1000;
  if (ctx.workspaceId && docId === ctx.workspaceId) score += 700;
  if (ctx.workspaceId && workspaceId === ctx.workspaceId) score += 500;
  if (ctx.email && email === ctx.email) score += 300;
  if (docId && workspaceId && docId === workspaceId) score += 150;
  if (ctx.userUid && docId === ctx.userUid) score -= 100;
  return score;
}

async function findCanonicalMemberDoc(db, ctx) {
  const directIds = [ctx.knownId, ctx.workspaceId]
    .map(normalizeId)
    .filter(Boolean);
  const snaps = [];

  for (const docId of directIds) {
    const snap = await db.collection("teamMembers").doc(docId).get();
    if (snap.exists) snaps.push(snap);
  }

  if (ctx.email) {
    const byEmail = await db.collection("teamMembers").where("email", "==", ctx.email).get();
    for (const snap of byEmail.docs) snaps.push(snap);
  }

  const deduped = new Map();
  for (const snap of snaps) {
    if (snap && snap.exists && !deduped.has(snap.id)) deduped.set(snap.id, snap);
  }

  const ranked = [...deduped.values()]
    .map((snap) => ({ snap, score: scoreMemberDoc(snap, ctx) }))
    .sort((a, b) => b.score - a.score);

  return ranked.length ? ranked[0].snap : null;
}

function randomTempPassword() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
  let out = "";
  for (let i = 0; i < 14; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
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

  const name = String(body.name || "").trim();
  const phone = String(body.phone || "").trim();
  const email = normalizeEmail(body.email);
  const role = String(body.role || "member").trim() || "member";
  const forcePasswordReset = body.forcePasswordReset !== false;

  if (!name) return json(res, 400, { ok: false, error: "name_required" });
  if (!email) return json(res, 400, { ok: false, error: "email_required" });

  const workspaceId = slug(name);

  let userRecord;
  let createdAuthUser = false;
  let generatedPassword = null;

  try {
    userRecord = await auth.getUserByEmail(email);
  } catch (err) {
    if (err && err.code === "auth/user-not-found") {
      generatedPassword = randomTempPassword();
      userRecord = await auth.createUser({
        uid: workspaceId,
        email,
        password: generatedPassword,
        displayName: name,
        emailVerified: false,
        disabled: false,
      });
      createdAuthUser = true;
    } else {
      return json(res, 500, { ok: false, error: "auth_lookup_failed", detail: String(err.message || err) });
    }
  }

  const knownCanonicalId = getKnownCanonicalMemberIdByEmail(email);
  let existingMemberSnap;
  try {
    existingMemberSnap = await findCanonicalMemberDoc(db, {
      email,
      workspaceId,
      knownId: knownCanonicalId,
      userUid: normalizeId(userRecord.uid),
    });
  } catch (err) {
    return json(res, 500, { ok: false, error: "member_lookup_failed", detail: String(err.message || err) });
  }
  const memberDocId = existingMemberSnap ? existingMemberSnap.id : (knownCanonicalId || workspaceId || userRecord.uid);
  const suppressedUidDuplicate = normalizeId(userRecord.uid) && normalizeId(userRecord.uid) !== normalizeId(memberDocId);

  if (existingMemberSnap) {
    console.log("[create-member] canonical member record found", {
      email,
      workspaceId,
      canonicalMemberId: memberDocId,
      authUid: userRecord.uid,
    });
  } else {
    console.log("[create-member] creating new canonical member record", {
      email,
      workspaceId,
      canonicalMemberId: memberDocId,
      authUid: userRecord.uid,
    });
  }
  if (suppressedUidDuplicate) {
    console.log("[create-member] duplicate UID member doc suppressed", {
      email,
      workspaceId,
      canonicalMemberId: memberDocId,
      suppressedUidDocId: userRecord.uid,
    });
  }

  try {
    const ts = admin.firestore.FieldValue.serverTimestamp();
    await db.collection("teamMembers").doc(memberDocId).set(
      {
        id: memberDocId,
        uid: userRecord.uid,
        workspaceId,
        name,
        email,
        phone: phone || null,
        role,
        active: true,
        updatedAt: ts,
        createdAt: ts,
        updatedBy: callerEmail,
      },
      { merge: true }
    );
  } catch (err) {
    return json(res, 500, { ok: false, error: "member_write_failed", detail: String(err.message || err) });
  }

  let passwordResetLink = null;
  if (forcePasswordReset) {
    try {
      passwordResetLink = await auth.generatePasswordResetLink(email);
    } catch {
      passwordResetLink = null;
    }
  }

  return json(res, 200, {
    ok: true,
    memberId: memberDocId,
    uid: userRecord.uid,
    workspaceId,
    email,
    canonicalMemberId: memberDocId,
    suppressedUidDuplicate,
    createdAuthUser,
    tempPassword: createdAuthUser ? generatedPassword : null,
    passwordResetLink,
  });
};

