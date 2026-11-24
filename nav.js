// ============================================================
//  nav.js — Shared navigation, utilities, icons
// ============================================================

import { watchUser, login, logout, checkAdmin, thumb, fileUrl } from "./firebase.js";

// ── HTML escape ───────────────────────────────────────────
export const esc = (s = "") =>
  String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );

// ── Time ago ──────────────────────────────────────────────
export function timeAgo(ts) {
  const d = ts instanceof Date ? ts : new Date(typeof ts === "number" ? ts : 0);
  const s = (Date.now() - d.getTime()) / 1000;
  if (isNaN(s) || s < 0) return "";
  if (s < 60)       return "abhi";
  if (s < 3600)     return Math.floor(s / 60)    + "m pehle";
  if (s < 86400)    return Math.floor(s / 3600)  + "h pehle";
  if (s < 2592000)  return Math.floor(s / 86400) + "d pehle";
  return d.toLocaleDateString("en-IN");
}

// ── SVG icons ─────────────────────────────────────────────
const I = (d) => `<svg class="ico" viewBox="0 0 24 24">${d}</svg>`;
export const icons = {
  home:    I('<path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>'),
  search:  I('<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>'),
  history: I('<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l3 2"/>'),
  library: I('<path d="M2 4h7a3 3 0 0 1 3 3v14a2 2 0 0 0-2-2H2z"/><path d="M22 4h-7a3 3 0 0 0-3 3v14a2 2 0 0 1 2-2h8z"/>'),
  menu:    I('<path d="M4 7h16M4 12h16M4 17h16"/>'),
  close:   I('<path d="M6 6l12 12M18 6L6 18"/>'),
  user:    I('<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>'),
  admin:   I('<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/>'),
  out:     I('<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>'),
};

// ── Cover image with fallback chain ──────────────────────
// cfail is global so onerror can call it
window.cfail = (img) => {
  const urls = JSON.parse(img.dataset.fb || "[]");
  const i    = (+img.dataset.fi || 0) + 1;
  if (i < urls.length) {
    img.dataset.fi = i;
    img.src = urls[i];
  } else {
    img.parentElement?.classList.add("noimg");
    img.remove();
  }
};

export function coverImg(comic, w = 300) {
  const raw  = fileUrl(comic, comic.cover || `ch1/001.${comic.ext || "webp"}`);
  const urls = [thumb(raw, w), raw];
  return `<img src="${urls[0]}" data-fb="${esc(JSON.stringify(urls))}" data-fi="0"
    alt="" loading="lazy" decoding="async" onerror="cfail(this)">`;
}

// ── Row card HTML (used by search + home) ─────────────────
export function rowHTML(c) {
  const link = `comic.html?id=${encodeURIComponent(c.id)}`;
  return `
  <a class="row" href="${link}">
    <div class="cover">${coverImg(c, 160)}</div>
    <div>
      <h3>${esc(c.title)}</h3>
      <p>${esc([c.type, c.status, ...(c.genres || []).slice(0, 2)].filter(Boolean).join(" · "))}</p>
      <p class="when">${c.latestChapter ? "Ch. " + esc(c.latestChapter) + " · " : ""}${timeAgo(c.updatedAt)}</p>
    </div>
  </a>`;
}

// ── Mount header + tabs + drawer ─────────────────────────
export function mountChrome(active) {
  // Header
  document.body.insertAdjacentHTML("afterbegin", `
  <header class="bar">
    <a class="brand" href="index.html">Comicpur</a>
    <a class="round" href="search.html" aria-label="Search">${icons.search}</a>
    <button class="menu-pill" id="menuBtn" aria-label="Menu">
      ${icons.menu}<span class="av" id="menuAv">?</span>
    </button>
  </header>`);

  // Bottom tabs
  const tab = (k, href, label) =>
    `<a href="${href}" class="${active === k ? "on" : ""}">
      <i>${icons[k]}</i>${label}
    </a>`;
  document.body.insertAdjacentHTML("beforeend", `
  <nav class="tabs">
    ${tab("home",    "index.html",              "Home")}
    ${tab("search",  "search.html",             "Search")}
    ${tab("history", "profile.html?tab=history","History")}
    ${tab("library", "profile.html?tab=library","Library")}
  </nav>
  <div class="scrim" id="scrim" hidden></div>
  <aside class="drawer" id="drawer" hidden>
    <div class="drawer-top">
      <span>Menu</span>
      <button class="round" id="closeBtn" aria-label="Bandh karo">${icons.close}</button>
    </div>
    <div id="drawerBody"></div>
  </aside>`);

  // Drawer open/close
  const drawer = document.getElementById("drawer");
  const scrim  = document.getElementById("scrim");
  const open   = ()  => { drawer.hidden = scrim.hidden = false; };
  const close  = ()  => { drawer.hidden = scrim.hidden = true;  };
  document.getElementById("menuBtn").onclick  = open;
  document.getElementById("closeBtn").onclick = close;
  scrim.onclick = close;

  // Auth state → populate drawer
  watchUser(async (u) => {
    const isAdmin = await checkAdmin(u);
    const av      = document.getElementById("menuAv");
    const body    = document.getElementById("drawerBody");

    // Update avatar
    if (u?.photoURL) {
      const img = document.createElement("img");
      img.className = "av"; img.id = "menuAv"; img.src = u.photoURL;
      av.replaceWith(img);
    } else {
      av.textContent = u ? (u.displayName || "U")[0].toUpperCase() : "?";
    }

    // Drawer content
    if (!u) {
      body.innerHTML = `
        <p class="sub" style="margin-bottom:14px">Login karke library aur history save karo.</p>
        <button class="btn solid" id="loginBtn" style="width:100%">Login / Sign up</button>`;
      document.getElementById("loginBtn").onclick = () =>
        login().catch((e) => alert("Login error: " + e.message));
      return;
    }

    const face = u.photoURL
      ? `<img class="av" src="${esc(u.photoURL)}" alt="">`
      : `<span class="av">${esc((u.displayName || "U")[0].toUpperCase())}</span>`;

    body.innerHTML = `
      <div class="who">
        ${face}
        <div>
          <b>${esc(u.displayName || "Reader")}</b>
          <small>${esc(u.email)}</small>
        </div>
      </div>
      <nav>
        <a href="profile.html">${icons.user} Profile</a>
        <a href="profile.html?tab=library">${icons.library} Library</a>
        <a href="profile.html?tab=history">${icons.history} History</a>
        ${isAdmin ? `<a href="admin.html">${icons.admin} Admin</a>` : ""}
        <button id="logoutBtn">${icons.out} Logout</button>
      </nav>`;
    document.getElementById("logoutBtn").onclick = () =>
      logout().then(close);
  });
}
