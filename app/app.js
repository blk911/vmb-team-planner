// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyA9uPFEC9jTpbxGNkSuGTtaVn5ojU5Ltl8",
  authDomain: "vmb-team.firebaseapp.com",
  projectId: "vmb-team",
  storageBucket: "vmb-team.firebasestorage.app",
  messagingSenderId: "288248384764",
  appId: "1:288248384764:web:b406a09f7e49173c5edb79",
  measurementId: "G-CMRTE1WBBD"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Team modal DOM + open/close (runs when DOM ready; index.html may not load this file)
function runTeamUI() {
  const $ = (id) => document.getElementById(id);
  function must(id) {
    const el = document.getElementById(id);
    if (!el) console.warn(`[planner] missing #${id} in index.html`);
    return el;
  }
  const teamBtn = must("teamBtn");
  const teamOverlay = must("teamOverlay");
  const teamCloseBtn = must("teamCloseBtn");
  const teamDoneBtn = must("teamDoneBtn");
  const teamName = must("teamName");
  const teamPhone = must("teamPhone");
  const teamEmail = must("teamEmail");
  const teamAddBtn = must("teamAddBtn");
  const teamList = must("teamList");
  const teamCountPill = must("teamCountPill");

  function openTeamModal() {
    if (!teamOverlay) return alert("Team UI missing: #teamOverlay not found.");
    teamOverlay.classList.add("show");
    teamOverlay.setAttribute("aria-hidden", "false");
    if (typeof renderTeamList === "function") renderTeamList();
  }
  function closeTeamModal() {
    if (!teamOverlay) return;
    teamOverlay.classList.remove("show");
    teamOverlay.setAttribute("aria-hidden", "true");
  }

  teamBtn?.addEventListener("click", openTeamModal);
  teamCloseBtn?.addEventListener("click", closeTeamModal);
  teamDoneBtn?.addEventListener("click", closeTeamModal);
  teamOverlay?.addEventListener("click", (e) => {
    if (e.target === teamOverlay) closeTeamModal();
  });
}
if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", runTeamUI);
  } else {
    runTeamUI();
  }
}