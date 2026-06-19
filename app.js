"use strict";

/* ============================================================
   Storage
   ============================================================ */

const STORAGE_KEYS = {
  trades:   "tpd_trades",
  settings: "tpd_settings",
};

const DEFAULT_SETTINGS = {
  usdToMznRate: 63,
  theme:        "dark",
  combo:        "blue",
  addCollapsed: false,
};

function uid() {
  return window.crypto?.randomUUID?.() ??
    "id_" + Date.now() + "_" + Math.random().toString(16).slice(2);
}

function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.settings);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : { ...DEFAULT_SETTINGS };
  } catch { return { ...DEFAULT_SETTINGS }; }
}

function saveSettings(s) {
  localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(s));
}

function loadTrades() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.trades);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveTrades(t) {
  localStorage.setItem(STORAGE_KEYS.trades, JSON.stringify(t));
}

/* ============================================================
   Theme & Accent
   ============================================================ */

const THEME_META = {
  dark:         { color: "#0d1117" },
  light:        { color: "#f6f8fa" },
  "glass-dark":  { color: "#060b14" },
  "glass-light": { color: "#dde8f5" },
};

function applyTheme(theme) {
  if (!THEME_META[theme]) theme = "dark";
  const html = document.documentElement;
  if (theme === "dark") {
    delete html.dataset.theme;
  } else {
    html.dataset.theme = theme;
  }
  const meta = document.getElementById("meta-theme-color");
  if (meta) meta.content = THEME_META[theme].color;

  document.querySelectorAll(".theme-btn").forEach(btn => {
    const active = btn.dataset.theme === theme;
    btn.classList.toggle("is-active", active);
    btn.setAttribute("aria-pressed", String(active));
  });
}

function applyCombo(combo) {
  const valid = ["blue", "violet", "teal"];
  if (!valid.includes(combo)) combo = "blue";
  const html = document.documentElement;
  if (combo === "blue") {
    delete html.dataset.combo;
  } else {
    html.dataset.combo = combo;
  }
  document.querySelectorAll(".combo-btn").forEach(btn => {
    const active = btn.dataset.combo === combo;
    btn.classList.toggle("is-active", active);
    btn.setAttribute("aria-pressed", String(active));
  });
}

function setTheme(theme) {
  const s = loadSettings(); s.theme = theme; saveSettings(s);
  applyTheme(theme);
  showToast("Theme applied");
}

function setCombo(combo) {
  const s = loadSettings(); s.combo = combo; saveSettings(s);
  applyCombo(combo);
  showToast("Accent color applied");
}

/* ============================================================
   Domain logic
   ============================================================ */

function addTrade(amountUSD, note) {
  const trades = loadTrades();
  trades.push({ id: uid(), amountUSD: parseFloat(amountUSD), note: (note||"").trim(), timestamp: Date.now() });
  saveTrades(trades);
}

function deleteTrade(id) {
  saveTrades(loadTrades().filter(t => t.id !== id));
}

function getBalanceUSD() {
  return loadTrades().reduce((acc, t) => acc + t.amountUSD, 0);
}

function convertToMZN(usd) {
  return usd * loadSettings().usdToMznRate;
}

/* ============================================================
   Formatting
   ============================================================ */

const usdFmt = new Intl.NumberFormat("en-US", {
  style: "currency", currency: "USD", signDisplay: "always",
});

const mznFmt = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2, maximumFractionDigits: 2,
});

function signClass(n) {
  return n > 0 ? "is-positive" : n < 0 ? "is-negative" : "is-zero";
}

function fmtDate(ts) {
  return new Date(ts).toLocaleString(undefined, {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

function escapeHtml(str) {
  const d = document.createElement("div");
  d.textContent = str;
  return d.innerHTML;
}

/* ============================================================
   Rendering
   ============================================================ */

function renderTicker() {
  document.getElementById("ticker-rate-value").textContent =
    loadSettings().usdToMznRate.toFixed(2);
}

function renderBalance() {
  const balUSD = getBalanceUSD();
  const balMZN = convertToMZN(balUSD);
  const trades  = loadTrades();

  // Big dual display
  const usdEl = document.getElementById("balance-usd");
  usdEl.textContent = usdFmt.format(balUSD);
  usdEl.className = "balance__usd " + signClass(balUSD);

  document.getElementById("balance-mzn").textContent =
    mznFmt.format(balMZN) + " MZN";

  document.getElementById("trade-count").textContent =
    trades.length === 1 ? "1 trade" : `${trades.length} trades`;

  // Last 2 trades mini section
  renderRecentTrades(trades);
}

function renderRecentTrades(trades) {
  const container = document.getElementById("recent-trades");
  container.innerHTML = "";

  const last2 = trades.slice(-2).reverse(); // most recent first
  if (last2.length === 0) return;

  for (const t of last2) {
    const mzn = convertToMZN(t.amountUSD);
    const el = document.createElement("div");
    el.className = "recent-trade";
    el.innerHTML = `
      <div class="recent-trade__label">
        <span class="recent-trade__note">${escapeHtml(t.note) || "&mdash;"}</span>
        <span class="recent-trade__time">${fmtDate(t.timestamp)}</span>
      </div>
      <div class="recent-trade__amounts">
        <span class="recent-trade__usd ${signClass(t.amountUSD)}">${usdFmt.format(t.amountUSD)}</span>
        <span class="recent-trade__mzn">${mznFmt.format(mzn)} MZN</span>
      </div>
    `;
    container.appendChild(el);
  }
}

function renderHistory() {
  const trades = loadTrades().slice().reverse();
  const container = document.getElementById("history");
  container.innerHTML = "";

  if (trades.length === 0) {
    const empty = document.createElement("div");
    empty.className = "history__empty";
    empty.textContent = "No trades yet — add your first one above.";
    container.appendChild(empty);
    return;
  }

  for (const t of trades) {
    const mzn = convertToMZN(t.amountUSD);
    const row = document.createElement("div");
    row.className = "trade";
    row.innerHTML = `
      <div class="trade__row">
        <div class="trade__main">
          <p class="trade__note">${escapeHtml(t.note) || "&mdash;"}</p>
          <span class="trade__time">${fmtDate(t.timestamp)}</span>
        </div>
        <div class="trade__amounts">
          <span class="trade__usd ${signClass(t.amountUSD)}">${usdFmt.format(t.amountUSD)}</span>
          <span class="trade__mzn">${mznFmt.format(mzn)} MZN</span>
        </div>
        <button class="trade__delete" data-id="${t.id}" title="Delete" aria-label="Delete trade">&times;</button>
      </div>
    `;
    container.appendChild(row);
  }

  container.querySelectorAll(".trade__delete").forEach(btn => {
    btn.addEventListener("click", () => {
      deleteTrade(btn.dataset.id);
      renderAll();
      showToast("Trade removed");
    });
  });
}

function renderAll() {
  renderTicker();
  renderBalance();
  renderHistory();
}

/* ============================================================
   Add Trade — collapsible
   ============================================================ */

const addCard       = document.getElementById("add-card");
const addBody       = document.getElementById("add-body");
const addToggle     = document.getElementById("add-toggle");
const addCompactBtn = document.getElementById("add-compact-btn");

function setAddCollapsed(collapsed, save = true) {
  addCard.classList.toggle("is-collapsed", collapsed);
  addToggle.setAttribute("aria-expanded", String(!collapsed));
  addCompactBtn.hidden = !collapsed;

  if (save) {
    const s = loadSettings();
    s.addCollapsed = collapsed;
    saveSettings(s);
  }
}

addToggle.addEventListener("click", () => {
  setAddCollapsed(!addCard.classList.contains("is-collapsed"));
});

addCompactBtn.addEventListener("click", () => {
  setAddCollapsed(false);
  setTimeout(() => document.getElementById("trade-amount").focus(), 200);
});

/* ============================================================
   Toast
   ============================================================ */

let toastTimer = null;
function showToast(message) {
  const el = document.getElementById("toast");
  el.textContent = message;
  el.classList.add("is-visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("is-visible"), 1800);
}

/* ============================================================
   Event wiring
   ============================================================ */

document.getElementById("trade-form").addEventListener("submit", e => {
  e.preventDefault();
  const amtEl  = document.getElementById("trade-amount");
  const noteEl = document.getElementById("trade-note");
  const amount = amtEl.value;
  if (amount === "" || isNaN(parseFloat(amount))) return;

  addTrade(amount, noteEl.value);
  amtEl.value = ""; noteEl.value = "";
  amtEl.focus();
  renderAll();
  showToast("Trade added");
});

document.getElementById("rate-form").addEventListener("submit", e => {
  e.preventDefault();
  const rate = parseFloat(document.getElementById("rate-input").value);
  if (isNaN(rate) || rate <= 0) return;
  const s = loadSettings(); s.usdToMznRate = rate; saveSettings(s);
  renderAll();
  showToast("Rate saved");
});

document.getElementById("clear-history").addEventListener("click", () => {
  if (loadTrades().length === 0) return;
  if (!confirm("Clear all trades? This cannot be undone.")) return;
  saveTrades([]);
  renderAll();
  showToast("History cleared");
});

document.getElementById("reset-all").addEventListener("click", () => {
  if (!confirm("Reset all data — trades and settings? This cannot be undone.")) return;
  localStorage.removeItem(STORAGE_KEYS.trades);
  localStorage.removeItem(STORAGE_KEYS.settings);
  renderAll();
  document.getElementById("rate-input").value = loadSettings().usdToMznRate;
  applyTheme("dark");
  applyCombo("blue");
  setAddCollapsed(false, false);
  showToast("All data reset");
});

// Theme & combo buttons
document.querySelectorAll(".theme-btn").forEach(btn =>
  btn.addEventListener("click", () => setTheme(btn.dataset.theme))
);
document.querySelectorAll(".combo-btn").forEach(btn =>
  btn.addEventListener("click", () => setCombo(btn.dataset.combo))
);

/* ============================================================
   View routing
   ============================================================ */

const VALID_VIEWS = ["balance", "history", "settings"];

function applyView(view) {
  document.querySelectorAll(".view").forEach(el =>
    el.classList.toggle("view--active", el.dataset.view === view)
  );

  const subheader = document.getElementById("subheader");
  const isBalance = view === "balance";
  subheader.hidden = isBalance;

  document.getElementById("backbar-history").hidden = view !== "history";
  document.getElementById("backbar-settings").hidden = view !== "settings";

  window.scrollTo(0, 0);
}

function showView(view, { replace = false } = {}) {
  if (!VALID_VIEWS.includes(view)) view = "balance";
  const hash = "#/" + view;
  if (replace) {
    history.replaceState(null, "", hash);
    applyView(view);
    return;
  }
  if (location.hash !== hash) location.hash = hash;
  else applyView(view);
}

function currentViewFromHash() {
  const v = location.hash.replace("#/", "");
  return VALID_VIEWS.includes(v) ? v : "balance";
}

window.addEventListener("hashchange", () => applyView(currentViewFromHash()));

document.querySelectorAll(".navtile, .backbtn").forEach(btn =>
  btn.addEventListener("click", () => showView(btn.dataset.goto))
);

document.getElementById("ticker-rate").addEventListener("click", () => {
  showView("settings");
  setTimeout(() => document.getElementById("rate-input").focus(), 200);
});

/* ============================================================
   PWA install
   ============================================================ */

let deferredInstallEvent = null;
const installBtn = document.getElementById("install-btn");

window.addEventListener("beforeinstallprompt", e => {
  e.preventDefault();
  deferredInstallEvent = e;
  installBtn.hidden = false;
});

installBtn.addEventListener("click", async () => {
  if (!deferredInstallEvent) return;
  deferredInstallEvent.prompt();
  await deferredInstallEvent.userChoice;
  deferredInstallEvent = null;
  installBtn.hidden = true;
});

window.addEventListener("appinstalled", () => {
  installBtn.hidden = true;
  showToast("App installed");
});

/* ============================================================
   Service worker
   ============================================================ */

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () =>
    navigator.serviceWorker.register("service-worker.js").catch(() => {})
  );
}

/* ============================================================
   Init
   ============================================================ */

const _s = loadSettings();
document.getElementById("rate-input").value = _s.usdToMznRate;
applyTheme(_s.theme  || "dark");
applyCombo(_s.combo  || "blue");
setAddCollapsed(_s.addCollapsed ?? false, false);
renderAll();
showView(currentViewFromHash(), { replace: true });
