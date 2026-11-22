# Shelf Shelf

**Your favourite sites as apps, folders and a dock — plus to-dos with reminders.** Built by **H24 Creationz**.

- 🌐 Product & download page: `https://harshavarthanep.github.io/Shelf-Shelf/download.html`
- 🧩 Extension: [Chrome Web Store](https://chromewebstore.google.com/detail/shelf-shelf-%E2%80%94-app-launche/bhhnembgfddoomakgmegbhkpklcgelhn) (works in Chrome, Edge, Brave, Vivaldi, Opera, Arc)
- 📱 Web app (installable PWA): `https://harshavarthanep.github.io/Shelf-Shelf/`
- 💻 Apps: Windows (Intel & AMD, plus ARM) · Mac (Intel & Apple Silicon) · Linux · Android · iPhone/iPad (Home Screen)

## What's in this repository

| Path | What it is |
|---|---|
| `index.html`, `css/`, `js/`, `icons/` | The web app. The website **and** the desktop and Android apps are built from it. |
| `manifest.webmanifest`, `sw.js` | Install as an app (PWA) and work offline. |
| `download.html` | Product & download page — detects the visitor's browser and device. |
| `media/` | Screenshots for the download page (and demo videos, when you add them). |
| `privacy.html`, `terms.html`, `support.html`, `contact.html`, `refunds.html`, `shipping.html`, `legal.css` | Policies and help — use these links in every store listing. |
| `pro.html` | Shelf Shelf Pro checkout (only shown when Pro is switched on in `js/config.js`). |
| `native/desktop/` | Windows / Mac / Linux app (Electron). |
| `native/mobile/` | Android app (Capacitor). |
| `native/shared/` | Copies the web app into the apps and adds `native-bridge.js`. |
| `.github/workflows/build-apps.yml` | One button that builds every app and publishes them. |

## Links for store listings

| Store field | Link |
|---|---|
| Website / homepage | `https://harshavarthanep.github.io/Shelf-Shelf/download.html` |
| Privacy policy | `https://harshavarthanep.github.io/Shelf-Shelf/privacy.html` |
| Terms | `https://harshavarthanep.github.io/Shelf-Shelf/terms.html` |
| Support | `https://harshavarthanep.github.io/Shelf-Shelf/support.html` |
| Support email | `h24creationz@gmail.com` |

## When the extension goes live in another store

Open `download.html`, find `var STORES = [` near the bottom, and paste the store link between the quotes, for example
`{ id: 'firefox', name: 'Firefox', store: 'Firefox Add-ons', url: 'https://addons.mozilla.org/firefox/addon/shelf-shelf/' },`
Commit. Visitors on that browser now get "Add to Firefox", and the browser list marks it **Available**.
(Edge and Opera visitors are already sent to the Chrome Web Store until their own links are added.)

## Demo videos (optional)

Put them in `media/` with these names and the "See it in action" section appears by itself:
`ShelfShelf-30s-Horizontal.mp4`, `ShelfShelf-Demo.mp4`, `ShelfShelf-30s-Vertical.mp4`.

## Building the apps (once, then for every update)

1. **Signing key:** add the 4 secrets from the separate PRIVATE zip (`GITHUB-SECRETS-READ-ME.txt`) — *Settings → Secrets and variables → Actions → New repository secret*. Never upload that zip.
2. **Actions → "Build Shelf Shelf apps" → Run workflow →** version `1.0.0` **→ Run workflow.**
3. After about 15–20 minutes a **Release** appears with every file, and `download.html` switches from "Coming soon" to real download buttons by itself.
4. Next update: commit your changes, then run the workflow again with a **higher** version (`1.0.1`, `1.0.2`…).

> **Tip — the `.github` folder:** Mac and Windows hide folders that start with a dot. If it didn't upload, on GitHub choose
> *Add file → Create new file*, type `.github/workflows/build-apps.yml`, paste the file's contents and commit.

## Updating the web app

Replace the files, then change the `VERSION` line at the top of `sw.js` (for example `shelf-web-2.7.4`). Visitors get the new version on their next visit.

## Notes for each platform

- **Windows:** first run shows *"Windows protected your PC"* → *More info → Run anyway* (normal without a paid code-signing certificate).
- **Mac:** first open → *System Settings → Privacy & Security → Open Anyway*.
- **Linux:** `.deb` for Ubuntu/Debian/Mint, `.AppImage` for everything else.
- **Android:** reminders use Android notifications; Export Backup saves to *Documents/Shelf Shelf*. Keep the signing key safe — updates only install over the old version when signed with the same key.
- **iPhone/iPad:** Safari → Share → *Add to Home Screen*. `native/mobile` already includes the iOS setup for a future App Store release.
- In the desktop and Android apps, your sites open in your default browser.

---

Shelf Shelf · © H24 Creationz
