# MossyWoss OS

A fully functional, web-based, local-first operating system in a single HTML5 file.
Built for personal use. Everything is free — no paywalls, no accounts, no servers.

## What it is

Open `mossywoss_os.html` in any modern browser (phone, tablet, desktop) and you get a
complete desktop OS: login, desktop, taskbar, start menu, window manager, virtual
file system with Recycle Bin, a Store, and 80+ real apps and games.

- **Fresh-PC start**: only Recycle Bin, Files, and Browser are installed.
  Everything else installs from the Store — installs persist across reboots.
- **Browser**: real downloads into the OS file system (never the device), real
  in-browser ZIP extraction (deflate), and downloaded HTML5 games run inside the OS.
- **Publish Studio**: publish your own apps/games to the Store from a zip or folder,
  with mandatory upload rules and a content disclaimer.
- **MossGuard**: real local security scanning (static heuristic analysis) of files,
  downloads, zip entries, and published uploads — plus a real OS update system.
- **VoxelForge VR**: WebXR voxel survival with real controller tracking — swing to
  break blocks, punch mobs, draw a bow, thumbstick locomotion — and a full non-VR mode.
- **Code Studio**: real built-in interpreter for a practical C/C++/C# subset,
  plus HTML/CSS/JS with live preview, and a visual block mode.

## Download & install

Direct downloads (always the latest build — refreshed automatically on every push):

| Platform | Download |
|---|---|
| Android (7.0+) | [mossywoss.apk](https://github.com/foxydev109-ux/mossywoss-os/releases/latest/download/mossywoss.apk) |
| Windows 10 / 11 | [mossywoss-os-windows.zip](https://github.com/foxydev109-ux/mossywoss-os/releases/latest/download/mossywoss-os-windows.zip) |
| Linux | [mossywoss-os-linux.zip](https://github.com/foxydev109-ux/mossywoss-os/releases/latest/download/mossywoss-os-linux.zip) |
| Any other device | [mossywoss-os-web.zip](https://github.com/foxydev109-ux/mossywoss-os/releases/latest/download/mossywoss-os-web.zip) |

**Android:** download the APK, allow "install unknown apps" for your browser when asked, then install. The app runs the whole OS offline in a native app shell (WebView over a secure in-app origin, so saves and the file system work like the browser version).

**Windows 10/11:** extract the zip anywhere and double-click `mossywoss_os.html` — it opens as a full OS in your browser tab. Nothing is installed to your PC. Use the same browser each time to keep your files.

**Linux (Debian, Ubuntu, Fedora, Arch, ...):** extract, then:
```bash
chmod +x install.sh
./install.sh
```
This installs to `~/.local` (no root), adds the `mossywoss` command, and puts "Mossy Woss OS" in your app menu. `uninstall.sh` removes it.

**Any other device / manual:** extract the web zip and open `mossywoss_os.html` in any modern browser.

> Note: your files, apps, and settings are stored by the browser/WebView (local site storage). Same browser, same OS state. The OS also fits every screen size from small phones to 4K desktops.

## Project layout

- `mw_web/` — OS source modules (JS) + `three.min.js` (MIT-licensed Three.js r147)
- `mw_assemble.py` — builds the single-file `mossywoss_os.html`
- `tests/` — Node test harnesses (smoke, fresh-PC, boot persistence, browser
  download/zip, C interpreter, VR engine)

## Build

```bash
python3 mw_assemble.py
```

## Test

```bash
cd tests && node smoketest.js
```


## Installing the Android app (read this if install fails)

Direct download: `https://github.com/foxydev109-ux/mossywoss-os/releases/latest/download/mossywoss.apk`

**"App blocked to protect your device / Play Protect hasn't seen an app from
this developer before"** - this is Google Play Protect, not a fault in the
APK. It appears for ANY app that is not from the Play Store and whose
developer is new to Google (no installs/reputation yet). It cannot be removed
from inside an APK. To install anyway: tap **Install anyway** (or **More
details**, then **Install anyway**). If you prefer, Play Protect can be paused
in Play Store, Profile, Play Protect, Settings.

**"App not installed"** - on Android this means a package conflict, most often
an older copy with a different signing key. v1.2 changed the package name to
`com.foxydev109ux.mwos` and uses one stable signing key committed to this
repo, so it cannot conflict with earlier test builds. Steps:
1. Delete the old downloaded file(s) (for example `mossywoss (1).apk`).
2. Uninstall any older "MossyWoss OS" from Settings, Apps.
3. Download the latest APK again and install.
Your saves live inside the app, so uninstalling the OLD app clears the old
app's data only.

Honest limits: this is a sideloaded app signed with a self-generated key, not
a Play Store app, so the Play Protect prompt is expected. Verify any download
with `apksigner verify --print-certs` (signer: CN=MossyWoss OS, foxydev109-ux).
`tests/apk_install_check.sh` runs 15 offline install-readiness checks in CI.

The APK toolchain is pinned (build-tools 34.0.0, platform android-34). An
earlier bug let CI runners pick the NEWEST build-tools, which formats
`aapt2 dump badging` output differently and produced flaky gate failures
and inconsistent builds; the build now says which toolchain it used.

How the MWO Store and publishing work (real flow, no mock-ups):
see [docs/STORE_PUBLISH.md](docs/STORE_PUBLISH.md).
Full record of the Android install fix and final install steps:
[docs/FINAL_FIX_RECORD.md](docs/FINAL_FIX_RECORD.md).

## Architecture

Deep dive into every subsystem (VFS, zip engine, icon tiles, responsive shell,
MossGuard, interpreter, APK shell, CI) with ASCII diagrams:
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)

## What this really is (honest scope)

MossyWoss OS is a **web-based operating system simulation**: a complete desktop
environment, apps, games, file system, and store implemented in HTML/CSS/JS and
running inside a browser tab (or the Android WebView app). It is NOT a native
bootable OS — it does not run at the hardware level, replace your real OS, or
run desktop programs like native Windows/Linux software. Everything inside it is
its own real, working software (the games really play, the C interpreter really
executes your code, the zip extraction really decompresses), but it all runs in
the browser sandbox. Claims in this README only cover what the code actually does.

- **Android APK**: the same web OS wrapped in a native WebView shell (secure
  in-app origin, so saves and the virtual file system work). It is not a native
  re-write of every app.
- **Windows/Linux "installers"**: they place the single HTML file and open it in
  your browser. The Linux installer adds a command and menu entry; it never
  touches system directories or needs root.
- **The C interpreter**: a real interpreter for a practical C/C++/C# subset
  (variables, expressions, control flow, functions, arrays, pointers basics,
  console I/O) — not a full hosted C compiler.

## Separation from your device

- **Nothing on this page touches your real files.** The OS stores everything in
  the browser's own site storage (IndexedDB/localStorage) — one sandboxed bucket
  per browser. It cannot read or modify your device's files unless YOU import
  them through the OS's import pickers, and exports only go where you choose.
- The Windows zip contains one HTML file — no .exe, no installer, no registry
  changes, nothing installed to your PC. Delete the folder and it is gone.
- The Linux installer only writes to `~/.local/` for your user, and `uninstall.sh`
  removes exactly what it added.
- The Android app runs in a WebView sandbox with only INTERNET, CAMERA and
  MICROPHONE permissions (camera/mic only for the OS's own camera and recorder
  apps, requested at first use).

## Icons

The UI uses a pure-CSS icon system (gradient monogram tiles) — no emoji, no SVG,
no image files.

## Disclaimer

MOSSYWOSS OS IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED. In no event shall the author be liable for any claim, damages, or other
liability arising from the use of this software. The virtual environment, apps,
and games are for personal use. Published apps/games (via Publish Studio) are
user content under user responsibility; the built-in MossGuard scanner performs
local static analysis only and no scanner can guarantee 100% detection of
malicious content. Back up anything you care about — browser storage can be
cleared by the browser at any time.

## Rules this project follows

- Personal, offline, local-first. Nothing is uploaded to any server.
- All content free — no paywalls, subscriptions, or commercial posting.
- No brand names or copyrighted material anywhere in the OS.
- No placeholders, mock-ups, or simulated behavior — everything is real.
- No emoji, no SVG icons — pure-CSS icon tiles throughout.

## Contributing

Want to help? [CONTRIBUTING.md](CONTRIBUTING.md) lists every area — apps,
games, icon tiles, themes, responsive fixes, MossGuard rules, OS Lab
catalog, and the proposed native track in [ROADMAP.md](ROADMAP.md).
One-command reproducible build/test via the included Dockerfile.

## License & third-party notices

This project is MIT licensed (see [LICENSE](LICENSE)); third-party
references and trademark acknowledgements are in [NOTICE](NOTICE).
The OS Lab feature deep-links to real third-party projects (v86, WebVM,
JSLinux, and open-source OSes) without hosting, bundling, or redistributing
any of them — all rights belong to their owners, and MossyWoss OS claims no
affiliation or endorsement. Proprietary OS images (like Windows) are
deliberately excluded for licensing reasons.
