(function(win){
  const SESSION_KEY = "team.auth.session";
  const FLASH_KEY = "team.auth.flash";

  function normalizeEmail(value){
    return String(value || "").trim().toLowerCase();
  }

  function normalizeId(value){
    return String(value || "").trim().toLowerCase();
  }

  function getAllowedAdminEmails(){
    const fromWindow = Array.isArray(win.VMB_ALLOWED_ADMIN_EMAILS)
      ? win.VMB_ALLOWED_ADMIN_EMAILS
      : [];
    const emails = fromWindow
      .map(normalizeEmail)
      .filter(Boolean);
    if(!emails.includes("blk911@gmail.com")) emails.push("blk911@gmail.com");
    if(!emails.includes("admin@vmb.com")) emails.push("admin@vmb.com");
    // Keep the legacy address temporarily so older sessions or seeded docs do not lose access during cleanup.
    if(!emails.includes("admin@venmebaby.com")) emails.push("admin@venmebaby.com");
    return new Set(emails);
  }

  function getBypassHosts(){
    const defaults = ["localhost", "127.0.0.1", "::1"];
    const extra = Array.isArray(win.VMB_AUTH_BYPASS_HOSTS)
      ? win.VMB_AUTH_BYPASS_HOSTS
      : [];
    return new Set([...defaults, ...extra].map((v) => String(v || "").trim().toLowerCase()).filter(Boolean));
  }

  function shouldBypassAuth(){
    const host = String(win.location && win.location.hostname || "").toLowerCase();
    return getBypassHosts().has(host);
  }

  function getAuth(){
    if(win.firebaseAuth) return win.firebaseAuth;
    try {
      if(win.firebase && typeof win.firebase.auth === "function") return win.firebase.auth();
    } catch(_err) {}
    return null;
  }

  function getDb(){
    if(win.firebaseDb) return win.firebaseDb;
    try {
      if(win.firebase && typeof win.firebase.firestore === "function") return win.firebase.firestore();
    } catch(_err) {}
    return null;
  }

  function isAdminEmail(email){
    return getAllowedAdminEmails().has(normalizeEmail(email));
  }

  async function signInWithEmailPassword(email, password){
    const auth = getAuth();
    if(!auth || typeof auth.signInWithEmailAndPassword !== "function"){
      throw new Error("Auth not initialized.");
    }
    return auth.signInWithEmailAndPassword(normalizeEmail(email), String(password || ""));
  }

  async function signOut(){
    const auth = getAuth();
    clearStoredSession();
    setFlashMessage("");
    if(!auth || typeof auth.signOut !== "function") return;
    await auth.signOut();
  }

  function readSessionStorage(key){
    try {
      return win.sessionStorage.getItem(key);
    } catch(_err) {
      return null;
    }
  }

  function writeSessionStorage(key, value){
    try {
      win.sessionStorage.setItem(key, value);
    } catch(_err) {}
  }

  function removeSessionStorage(key){
    try {
      win.sessionStorage.removeItem(key);
    } catch(_err) {}
  }

  function setFlashMessage(message){
    const text = String(message || "").trim();
    if(!text){
      removeSessionStorage(FLASH_KEY);
      return;
    }
    writeSessionStorage(FLASH_KEY, text);
  }

  function consumeFlashMessage(){
    const value = readSessionStorage(FLASH_KEY);
    removeSessionStorage(FLASH_KEY);
    return value || "";
  }

  function clearStoredSession(){
    removeSessionStorage(SESSION_KEY);
  }

  function setStoredSession(session){
    if(!session || typeof session !== "object"){
      clearStoredSession();
      return;
    }
    writeSessionStorage(SESSION_KEY, JSON.stringify({
      role: session.role === "admin" ? "admin" : "member",
      email: normalizeEmail(session.email),
      workspaceId: normalizeId(session.workspaceId),
      ts: Date.now()
    }));
  }

  function getStoredSession(){
    try {
      const raw = readSessionStorage(SESSION_KEY);
      if(!raw) return null;
      const parsed = JSON.parse(raw);
      if(!parsed || typeof parsed !== "object") return null;
      return {
        role: parsed.role === "admin" ? "admin" : "member",
        email: normalizeEmail(parsed.email),
        workspaceId: normalizeId(parsed.workspaceId),
        ts: Number(parsed.ts) || 0
      };
    } catch(_err) {
      return null;
    }
  }

  function persistSessionFromAccess(access){
    if(!access){
      clearStoredSession();
      return;
    }
    if(access.bypass){
      setStoredSession({
        role: "admin",
        email: access.email || "",
        workspaceId: access.workspaceId || "jsw"
      });
      return;
    }
    if(!access.user){
      clearStoredSession();
      return;
    }
    setStoredSession({
      role: access.admin ? "admin" : "member",
      email: access.email || "",
      workspaceId: access.workspaceId || access.member?.workspaceId || access.member?.id || access.user?.uid || ""
    });
  }

  function clearPlannerSessionState(){
    const localKeys = [
      "planner.forceMember",
      "planner.ui.v1"
    ];
    for(const key of localKeys){
      try { win.localStorage.removeItem(key); } catch(_err) {}
    }
    removeSessionStorage(SESSION_KEY);
    removeSessionStorage(FLASH_KEY);
    try {
      const keys = [];
      for(let i = 0; i < win.sessionStorage.length; i++){
        const key = win.sessionStorage.key(i);
        if(key) keys.push(key);
      }
      for(const key of keys){
        if(/^(planner\.|daily_planner\.|vmb_)/.test(key)) win.sessionStorage.removeItem(key);
      }
    } catch(_err) {}
  }

  async function loadMemberProfile(user, db){
    if(!user || !db || typeof db.collection !== "function") return null;

    const uid = String(user.uid || "").trim();
    if(uid){
      const memberSnap = await db.collection("teamMembers").doc(uid).get();
      if(memberSnap.exists) return memberSnap.data() || {};
    }

    const email = normalizeEmail(user.email);
    if(!email) return null;

    const byEmail = await db.collection("teamMembers").where("email", "==", email).limit(1).get();
    if(byEmail.empty) return null;
    return byEmail.docs[0].data() || {};
  }

  async function resolveAccess(user, opts){
    const options = opts || {};
    const requireAdmin = options.requireAdmin === true;

    if(shouldBypassAuth()){
      return {
        ok: true,
        bypass: true,
        admin: true,
        email: "",
        user: user || null,
        workspaceId: "jsw",
        member: {
          id: "jsw",
          workspaceId: "jsw",
          name: "JSW",
          role: "admin",
          active: true
        }
      };
    }

    if(!user){
      return { ok: false, code: "signed_out", message: "Sign in required." };
    }

    const email = normalizeEmail(user.email);
    const admin = isAdminEmail(email);
    if(admin){
      return {
        ok: true,
        admin: true,
        bypass: false,
        email,
        user,
        workspaceId: "jsw",
        member: {
          id: "admin",
          workspaceId: "jsw",
          email,
          role: "admin",
          active: true
        }
      };
    }

    if(requireAdmin){
      return {
        ok: false,
        code: "not_admin",
        message: "Admin access required.",
        email,
        user
      };
    }

    const db = getDb();
    if(!db){
      return {
        ok: false,
        code: "db_unavailable",
        message: "Membership lookup unavailable.",
        email,
        user
      };
    }

    const member = await loadMemberProfile(user, db);
    if(!member){
      return {
        ok: false,
        code: "member_missing",
        message: "Signed in, but no active member profile found.",
        email,
        user
      };
    }

    if(member.active === false){
      return {
        ok: false,
        code: "member_inactive",
        message: "Your member profile is inactive.",
        email,
        user,
        member
      };
    }

    return {
      ok: true,
      admin: false,
      bypass: false,
      email,
      user,
      member,
      workspaceId: normalizeId(member.workspaceId || member.id || user.uid) || "jsw"
    };
  }

  function onAccessChange(opts){
    const options = opts || {};
    const auth = getAuth();

    if(shouldBypassAuth()){
      Promise.resolve().then(function(){
        if(typeof options.onResolved === "function"){
          options.onResolved({
            ok: true,
            bypass: true,
            admin: true,
            email: "",
            user: null,
            workspaceId: "jsw",
            member: {
              id: "jsw",
              workspaceId: "jsw",
              name: "JSW",
              role: "admin",
              active: true
            }
          });
        }
      });
      return function(){};
    }

    if(!auth || typeof auth.onAuthStateChanged !== "function"){
      const err = new Error("Auth not initialized.");
      if(typeof options.onError === "function") options.onError(err);
      return function(){};
    }

    return auth.onAuthStateChanged(function(user){
      Promise.resolve(resolveAccess(user, options))
        .then(function(result){
          persistSessionFromAccess(result);
          if(typeof options.onResolved === "function") options.onResolved(result);
        })
        .catch(function(err){
          if(typeof options.onError === "function") options.onError(err);
        });
    }, function(err){
      if(typeof options.onError === "function") options.onError(err);
    });
  }

  win.VMBAuth = {
    normalizeEmail,
    normalizeId,
    getAllowedAdminEmails,
    shouldBypassAuth,
    getAuth,
    getDb,
    isAdminEmail,
    getStoredSession,
    setStoredSession,
    clearStoredSession,
    setFlashMessage,
    consumeFlashMessage,
    signInWithEmailPassword,
    signOut,
    clearPlannerSessionState,
    loadMemberProfile,
    resolveAccess,
    onAccessChange
  };
})(window);
