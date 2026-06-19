"use strict";

/* ============================================================
   Storage
   ============================================================ */

const STORAGE_KEYS = {
  trades: "tpd_trades",
  settings: "tpd_settings",
};

const DEFAULT_SETTINGS = {
  usdToMznRate: 63,
  theme: "dark",
};

function uid() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }
  return "id_" + Date.now() + "_" + Math.random().toString(16).slice(2);
}

function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.settings);
    if (!raw) return { ...DEFAULT_SETTINGS };
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function saveSettings(settings) {
  localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(settings));
}

function loadTrades() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.trades);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveTrades(trades) {
  localStorage.setItem(STORAGE_KEYS.trades, JSON.stringify(trades));
}

/* ============================================================
   Theme
   ============================================================ */

const THEME_META = {
  dark:        { color: "#0d1117" },
  light:       { color: "#f6f8fa" },
  "glass-dark":  { color: "#060b14" },
  "glass-light": { color: "#dde8f5" },
};

function applyTheme(theme) {
  const validThemes = Object.keys(THEME_META);
  if (!validThemes.includes(theme)) theme = "dark";

  document.documentElement.dataset.theme = theme === "dark" ? "" : theme;
  if (theme === "dark") {
    delete document.documentElement.dataset.theme;
  }

  const metaColor = document.getElementById("meta-theme-color");
  if (metaColor) metaColor.content = THEME_META[theme].color;

  document.querySelectorAll(".theme-btn").forEach((btn) => {
    const active = btn.dataset.theme === theme;
    btn.classList.toggle("is-active", active);
    btn.setAttribute("aria-pressed", String(active));
  });
}

function setTheme(theme) {
  const settings = loadSettings();
  settings.theme = theme;
  saveSettings(settings);
  applyTheme(theme);
  showToast("Theme applied");
}

/* ============================================================
   Domain logic
   ============================================================ */

function addTrade(amountUSD, note) {
  const trades = loadTrades();
  trades.push({
    id: uid(),
    amountUSD: parseFloat(amountUSD),
    note: (note || "").trim(),
    timestamp: Date.now(),
  });
  saveTrades(trades);
}

function deleteTrade(id) {
  const trades = loadTrades().filter((t) => t.id !== id);
  saveTrades(trades);
}

function getBalanceUSD() {
  return loadTrades().reduce((acc, t) => acc + t.amountUSD, 0);
}

function convertToMZN(amountUSD) {
  const { usdToMznRate } = loadSettings();
  return amountUSD * usdToMznRate;
}

/* ============================================================
   Formatting
   ============================================================ */

const usdFmt = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  signDisplay: "always",
});

const mznFmt = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function signClass(n) {
  if (n > 0) return "is-positive";
  if (n < 0) return "is-negative";
  return "is-zero";
}

/* ============================================================
   Rendering
   ============================================================ */

function renderTicker() {
  const settings = loadSettings();
  document.getElementById("ticker-rate-value").textContent =
    settings.usdToMznRate.toFixed(2);
}

function renderBalance() {
  const balanceUSD = getBalanceUSD();
  const balanceMZN = convertToMZN(balanceUSD);
  const trades = loadTrades();

  const usdEl = document.getElementById("balance-usd");
  usdEl.textContent = usdFmt.format(balanceUSD);
  usdEl.classList.remove("is-positive", "is-negative", "is-zero");
  usdEl.classList.add(signClass(balanceUSD));

  document.getElementById("balance-mzn").textContent = mznFmt.format(balanceMZN);
  document.getElementById("trade-count").textContent =
    trades.length === 1 ? "1 trade" : `${trades.length} trades`;
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
    const row = document.createElement("div");
    row.className = "trade";

    const mzn = convertToMZN(t.amountUSD);
    const dateStr = new Date(t.timestamp).toLocaleString(undefined, {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });

    row.innerHTML = `
      <div class="trade__row">
        <div class="trade__main">
          <p class="trade__note">${escapeHtml(t.note) || "&mdash;"}</p>
          <span class="trade__time">${dateStr}</span>
        </div>
        <div class="trade__amounts">
          <div class="trade__usd ${signClass(t.amountUSD)}">${usdFmt.format(t.amountUSD)}</div>
          <div class="trade__mzn">${mznFmt.format(mzn)} MZN</div>
        </div>
        <button class="trade__delete" data-id="${t.id}" title="Delete trade" aria-label="Delete trade">&times;</button>
      </div>
    `;
    container.appendChild(row);
  }

  container.querySelectorAll(".trade__delete").forEach((btn) => {
    btn.addEventListener("click", () => {
      deleteTrade(btn.dataset.id);
      renderAll();
      showToast("Trade removed");
    });
  });
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function renderAll() {
  renderTicker();
  renderBalance();
  renderHistory();
}

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

document.getElementById("trade-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const amountInput = document.getElementById("trade-amount");
  const noteInput = document.getElementById("trade-note");

  const amount = amountInput.value;
  if (amount === "" || isNaN(parseFloat(amount))) return;

  addTrade(amount, noteInput.value);
  amountInput.value = "";
  noteInput.value = "";
  amountInput.focus();

  renderAll();
  showToast("Trade added");
});

document.getElementById("rate-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const rateInput = document.getElementById("rate-input");
  const rate = parseFloat(rateInput.value);
  if (isNaN(rate) || rate <= 0) return;

  const settings = loadSettings();
  settings.usdToMznRate = rate;
  saveSettings(settings);

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
  showToast("All data reset");
});

/* Theme buttons */
document.querySelectorAll(".theme-btn").forEach((btn) => {
  btn.addEventListener("click", () => setTheme(btn.dataset.theme));
});

/* ============================================================
   View routing
   ============================================================ */

const VALID_VIEWS = ["balance", "history", "settings"];

function applyView(view) {
  document.querySelectorAll(".view").forEach((el) => {
    el.classList.toggle("view--active", el.dataset.view === view);
  });

  document.getElementById("navtiles").hidden = view !== "balance";
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
  if (location.hash !== hash) {
    location.hash = hash;
  } else {
    applyView(view);
  }
}

function currentViewFromHash() {
  const v = location.hash.replace("#/", "");
  return VALID_VIEWS.includes(v) ? v : "balance";
}

window.addEventListener("hashchange", () => applyView(currentViewFromHash()));

document.querySelectorAll(".navtile, .backbtn").forEach((btn) => {
  btn.addEventListener("click", () => showView(btn.dataset.goto));
});

document.getElementById("ticker-rate").addEventListener("click", () => {
  showView("settings");
  setTimeout(() => document.getElementById("rate-input").focus(), 200);
});

/* ============================================================
   PWA install prompt
   ============================================================ */

let deferredInstallEvent = null;
const installBtn = document.getElementById("install-btn");

window.addEventListener("beforeinstallprompt", (e) => {
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
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("service-worker.js").catch(() => {});
  });
}

/* ============================================================
   Init
   ============================================================ */

const _initSettings = loadSettings();
document.getElementById("rate-input").value = _initSettings.usdToMznRate;
applyTheme(_initSettings.theme || "dark");
renderAll();
showView(currentViewFromHash(), { replace: true });
