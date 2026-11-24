// ============================================================
//  firebase.js — Comicpur backend helpers
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import {
  getFirestore,
  collection, getDocs, getDoc, setDoc, deleteDoc,
  doc, query, orderBy, limit, serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

// ── Firebase init ──────────────────────────────────────────
const _app = initializeApp({
  apiKey:            "AIzaSyAct9qGdPor_WyQ5k9Gad6HYRi_5Z_Tb_A",
  authDomain:        "comicpur-e6725.firebaseapp.com",
  projectId:         "comicpur-e6725",
  storageBucket:     "comicpur-e6725.firebasestorage.app",
  messagingSenderId: "976881280643",
  appId:             "1:976881280643:web:3d4c78889c7c4b86f49db6",
});
export const auth = getAuth(_app);
export const db   = getFirestore(_app);

// Re-export Firestore helpers so pages can import them
export {
  collection, getDocs, getDoc, setDoc, deleteDoc,
  doc, query, orderBy, limit, serverTimestamp,
};

// ── Admin ──────────────────────────────────────────────────
export const ADMIN_EMAIL = "maxton480@gmail.com";

export function checkAdmin(u) {
  return Promise.resolve(
    !!u &&
    u.emailVerified === true &&
    (u.email || "").toLowerCase() === ADMIN_EMAIL
  );
}
export const sendVerify   = (u) => sendEmailVerification(u);
export const refreshUser  = async () => {
  await auth.currentUser.reload();
  await auth.currentUser.getIdToken(true);
};

// ── Images (GitHub raw CDN) ───────────────────────────────
export const IMG_BASE = "https://raw.githubusercontent.com/maxton480/comics/main/";

const _enc = (p) => p.split("/").map(encodeURIComponent).join("/");

/** Full URL for any file inside a comic folder */
export const fileUrl  = (comic, rel) =>
  IMG_BASE + encodeURIComponent(comic.folder) + "/" + _enc(rel);

/** URL for a specific page image */
export const pageUrl  = (comic, chNum, pageNum) =>
  `${IMG_BASE}${encodeURIComponent(comic.folder)}/ch${encodeURIComponent(chNum)}/${
    String(pageNum).padStart(comic.pad || 3, "0")}.${comic.ext || "webp"}`;

/** Compressed thumbnail via wsrv.nl proxy */
export const thumb = (url, w = 300, q = 72) =>
  `https://wsrv.nl/?url=${encodeURIComponent(url)}&w=${w}&q=${q}&output=webp`;

// ── Auth ──────────────────────────────────────────────────
export const login = () => {
  const page = (location.pathname.split("/").pop() || "index.html") + location.search;
  location.href = "login.html?next=" + encodeURIComponent(page);
  return new Promise(() => {}); // never resolves — navigation happening
};
export const emailLogin  = (email, pw)       => signInWithEmailAndPassword(auth, email, pw);
export const emailSignup = async (email, pw, name) => {
  const c = await createUserWithEmailAndPassword(auth, email, pw);
  if (name) await updateProfile(c.user, { displayName: name });
  if ((email || "").toLowerCase() === ADMIN_EMAIL)
    await sendEmailVerification(c.user).catch(() => {});
  return c;
};
export const resetPassword = (email) => sendPasswordResetEmail(auth, email);
export const logout        = ()      => signOut(auth);
export const watchUser     = (cb)    => onAuthStateChanged(auth, cb);

// ── Comics (with 3-min localStorage cache) ───────────────
const _CK  = "cp_comics_v3";
const _TTL = 3 * 60 * 1000;

const _ms = (t) =>
  t?.toMillis ? t.toMillis() :
  typeof t === "number" ? t :
  t?.seconds ? t.seconds * 1000 : 0;

const _norm = (id, d) => ({
  id,
  ...d,
  updatedAt: _ms(d.updatedAt),
  createdAt: _ms(d.createdAt),
});

const _readCache = () => {
  try {
    const c = JSON.parse(localStorage.getItem(_CK) || "null");
    return c && Date.now() - c.t < _TTL ? c.d : null;
  } catch { return null; }
};

export const clearCache = () => { try { localStorage.removeItem(_CK); } catch {} };

export async function getComics(force = false) {
  if (!force) { const c = _readCache(); if (c) return c; }
  const snap = await getDocs(
    query(collection(db, "comics"), orderBy("updatedAt", "desc"), limit(300))
  );
  const d = snap.docs.map((x) => _norm(x.id, x.data()));
  try { localStorage.setItem(_CK, JSON.stringify({ t: Date.now(), d })); } catch {}
  return d;
}

export async function getComic(id) {
  const cached = _readCache()?.find((x) => x.id === id);
  if (cached) return cached;
  const s = await getDoc(doc(db, "comics", id));
  return s.exists() ? _norm(s.id, s.data()) : null;
}

export const sortedChapters = (c) =>
  [...(c.chapterList || [])].sort((a, b) => parseFloat(a.n) - parseFloat(b.n));

// ── History ───────────────────────────────────────────────
export function localHistory() {
  try { return JSON.parse(localStorage.getItem("cp_history") || "[]"); }
  catch { return []; }
}

export async function saveProgress(user, comic, chNum) {
  const entry = {
    id:     comic.id,
    title:  comic.title,
    folder: comic.folder,
    cover:  comic.cover  || "",
    ext:    comic.ext    || "",
    ch:     chNum,
    ts:     Date.now(),
  };
  const hist = localHistory().filter((x) => x.id !== comic.id);
  hist.unshift(entry);
  try { localStorage.setItem("cp_history", JSON.stringify(hist.slice(0, 50))); } catch {}
  if (user) {
    await setDoc(doc(db, "users", user.uid, "history", comic.id), entry).catch(() => {});
  }
}

// ── Toast ─────────────────────────────────────────────────
let _toastTimer;
export function showToast(msg) {
  let el = document.getElementById("toast");
  if (!el) {
    el = Object.assign(document.createElement("div"), {
      id: "toast", className: "toast", role: "status",
    });
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add("on");
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => el.classList.remove("on"), 2400);
}

// ── Capacitor (Android) back button ──────────────────────
const _cap = window.Capacitor;
if (_cap?.isNativePlatform?.()) {
  const App = _cap.Plugins?.App || _cap.registerPlugin?.("App");
  let _lastBack = 0;
  App?.addListener("backButton", () => {
    const drawer = document.getElementById("drawer");
    if (drawer && !drawer.hidden) {
      document.getElementById("closeBtn")?.click();
      return;
    }
    const page = location.pathname.split("/").pop() || "index.html";
    if (page === "index.html") {
      if (Date.now() - _lastBack < 2000) App.exitApp();
      else { _lastBack = Date.now(); showToast("Bahar jaane ke liye dobara back dabao"); }
    } else if (history.length > 1) {
      history.back();
    } else {
      location.replace("index.html");
    }
  });
}

// ── PWA service worker ────────────────────────────────────
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}
