# Trading Pocket Dashboard

Mobile-first PWA trading journal. USD balance, live USD→MZN conversion, trade
history, all stored locally on the device (`localStorage`). No backend, no
account, no network calls.

## Files

```
index.html          structure
style.css            GitHub-dark theme, mobile-first
app.js                all logic: storage, rendering, install prompt
manifest.json    PWA metadata (name, icons, colors)
service-worker.js   offline caching
icons/                  192px + 512px app icons
```

## Run it locally (desktop test)

Service workers require a "secure context" — `file://` won't register one.
Serve it over `http://localhost` instead:

```bash
cd tpd
python3 -m http.server 8080
```

Then open `http://localhost:8080` in Chrome.

## Install on your phone

`localhost` only works on the same machine, so to install on Android Chrome
you need it hosted somewhere with HTTPS. Easiest free options:

**GitHub Pages**
1. Push this folder to a GitHub repo.
2. Repo Settings → Pages → deploy from the `main` branch root.
3. Open the resulting `https://yourname.github.io/repo/` URL on your phone.

**Netlify Drop** (no git needed)
1. Go to https://app.netlify.com/drop
2. Drag the `tpd` folder in.
3. Open the generated URL on your phone.

Once open on Android Chrome:
- Tap the **⋮** menu → **"Add to Home screen"** / **"Install app"**,
  or tap the **Install App** button inside Settings if Chrome offers it
  automatically.

## Notes

- All data lives in `localStorage` on that one browser/device — clearing
  site data or switching browsers wipes it. There's no sync.
- The exchange rate is manual (Settings card) — there's no live FX feed.
- Tapping the rate chip in the header jumps straight to the rate field.
- "Clear" under History wipes trades only; "Reset All Data" wipes trades
  *and* the saved rate.

## Natural next upgrades

- Equity curve chart (Chart.js)
- Trade tags (SMC, breakout, etc.) + win rate / expectancy
- Daily journal reminder
- Optional cloud sync (Google Drive / Firebase)
