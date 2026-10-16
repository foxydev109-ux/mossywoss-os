# Final fix record: "App not installed" on Android (resolved 2026-10-16)

This is the complete record of the install failure on a Galaxy S10 Lite
(Android 15), what each symptom was, the real root causes found, and the
exact final steps that work. Written after everything was verified against
the actual GitHub release, not before.

## Timeline of the two errors seen on the phone

```
[install attempt]        -> "Installing..." spinner
Play Protect prompt       -> "App blocked to protect your device.
                             Play Protect hasn't seen an app from this
                             developer before. It may be unsafe."
   (tap Install anyway)
final result              -> "App not installed"
```

The two errors had two DIFFERENT causes. Treating them as one bug is why
this took several rounds.

## Cause 1: "App not installed" (the hard failure)

Early test APKs were signed with a sandbox keystore that was never saved:
every rebuild produced a different signing key. Android refuses to update
an installed app when the new APK has a different key, and refuses a second
install with the same package name under a different key. So the phone held
an old "MossyWoss OS" (package com.foxydev109ux.mossywoss) that no new APK
could ever replace.

## Cause 2: CI kept failing, so the fixed APK never reached GitHub

Three consecutive CI failures meant the release kept serving the OLD APK.
The failures had two real bugs:

1. build_apk.sh downloaded androidx `annotation-1.6.0.jar` but compiled
   against `annotation-jvm-1.6.0.jar`. It only worked on machines where the
   right jar already existed. (fixed in commit 1fe9c26)
2. The script picked the NEWEST build-tools and platform on the machine.
   GitHub runners ship newer versions than local, so CI used a different
   aapt2 - it prints `minSdkVersion:'24'` where build-tools 34 prints
   `sdkVersion:'24'`, and linked against platform 37 instead of 34. This
   made CI builds non-deterministic and tripped the install gate.
   (fixed in commit 314ac71: toolchain pinned to build-tools 34.0.0 +
   platform android-34, gate parses both formats and prints what it saw)

## The fix stack (all verified, in order)

| # | Fix | Where | Verified by |
|---|-----|-------|-------------|
| 1 | Package renamed to com.foxydev109ux.mwos (cannot collide with old builds) | commit 740af4e | aapt2 badging on the released APK |
| 2 | Dedicated release key (CN=MossyWoss OS), committed, stable across CI | commit 740af4e | apksigner on the released APK |
| 3 | Install-readiness gate in the build + 15-check offline test | commit 740af4e | tests/apk_install_check.sh 15/15 |
| 4 | Correct androidx jar downloaded + missing-library guard | commit 1fe9c26 | build from a completely clean SDK dir |
| 5 | Toolchain pinned; gate accepts both aapt2 formats, prints diagnostics | commit 314ac71 | CI green; released APK says platform 34 |
| 6 | Released APK downloaded back from GitHub and checked | - | 15/15 checks on the exact released file |

Final verified state of the released APK:
package `com.foxydev109ux.mwos`, versionCode 3 (versionName 1.2),
signed v1+v2+v3 with CN=MossyWoss OS, foxydev109-ux, resources.arsc
stored, minSdk 24, targetSdk 34, launcher activity and icon present.

## Final install steps (these are the steps that work)

1. Settings, Apps: uninstall any old "MossyWoss OS" (any old build).
2. Files/Downloads: delete old APK files (e.g. "mossywoss (1).apk").
3. Download fresh:
   https://github.com/foxydev109-ux/mossywoss-os/releases/latest/download/mossywoss.apk
4. If Play Protect warns, choose More details, then Install anyway.
   This prompt appears for every sideloaded app from a developer Google
   has no reputation for. It is not an error in the APK and cannot be
   removed from inside the APK.
5. The app installs as "MossyWoss OS" with your saves inside the app.

What changed for the user after the fix: updates install cleanly over it
from now on (same key, same package), and if a future APK is ever rejected
the build fails loudly in CI instead of shipping a stale file.

## Round 3 (16 Oct 2026) - "death logs me out" + search/Store/AI overhaul
- Dying in a 3D game no longer signs you out. Root cause: game-over buttons called `location.reload()`, which rebooted the whole OS and dropped the session. All 6 death/finish screens now restart the game in-window.
- Sessions auto-restore on reload (last signed-in user, `mwo_last_user`). An explicit Start menu "Sign out" shows the account picker again. Voxely 3D got a real death/respawn screen with a day counter.
- Voxely performance: chunk generation only runs when the player crosses a chunk border, plus adaptive render distance (drops to a smaller radius if FPS < 28). Fixes the ~20 FPS phone lag.
- MossGuard OS Updates: ships with the official GitHub manifest URL by default, so "Check for Updates" genuinely checks online. The "[FAIL] No manifest URL" red banner is replaced with a calm status; the wrong 5012 history dates are now real 2026 dates.
- Mossy AI: full offline free-chat engine (small talk, feelings, fox facts, jokes, math, time/date, real app roster answers, "open paint"-style commands). Honest about being local-only.
- Browser: searches the real web (DuckDuckGo Instant Answers API + Wikipedia, both CORS-enabled), "Open in Google / DuckDuckGo (new tab)" buttons for sites that refuse embedding, "New Tab" toolbar button, downloads stay inside MWO's VFS (/Downloads) and export to the device as real files.
- Files: "Export folder as ZIP" (real CRC32/deflate zip, device download + copy in /Downloads), fixed purge-artifact labels.
- Store: real categories (Games, Apps, Coding, Creative, AI, Tools); fixed "Run Run"/"Out Publish your own" artifacts.
- New apps: Game Pad (on-screen D-pad that injects genuine KeyboardEvents for keyboard-only games) and PE Inspector (real MZ/PE header, section and import-table parser for .exe/.dll files, honest static-inspection only).

## Round 4 (16 Oct 2026, evening) - Code Studio language fix, game controls, image-frame animation
- Code Studio: switching language now actually swaps the editor. Root cause: the language dropdown only replaced the editor content when the editor was EMPTY, so your JS code stayed in place while the app silently ran it through the wrong engine. Now: starter templates auto-swap, user code is kept with a clear notification of the active language. Also fixed the "Run Run" label, hidden emoji in the language list, and a single persistent window (re-opening focuses it).
- C/C++/C# interpreter (CInterp): verified real execution of printf, cout, Console.WriteLine, arrays, functions, structs, scanf/stdin, loops; fixed static class-method calls (e.g. Calc.Square(7) previously errored "Undefined variable Calc").
- Game movement: TouchPad (Sky Racers, Crimson Depths, etc.) kept drifting after you RELEASED the movement keys - the vector was never zeroed on key release. Fixed; also unhook global key listeners when a game window closes (leak fix).
- Animation Studio: real image-frame animation. "Import Image Frames" turns each selected image into one frame of a sequence (import order kept), played on the timeline at an adjustable seconds-per-frame; onion skin shows the neighbouring frames as blue ghosts while editing (ghosts never render into exports); "Export Frame PNG" saves the current frame to your device and to /Pictures. Fixed "Doc New" label artifact.

## Round 5 (17 Oct 2026) - smart file opening, image import in Code Studio, Visual Code SFX/VFX
- Files: double-click now does the right thing per type. .exe/.dll opens the PE Inspector on that file; .zip extracts into the OS filesystem (real extractor); images open in a preview window. Downloads from the Browser have always landed in /Downloads inside the OS - now they are usable there too.
- Code Studio: "Insert Image" imports image files (multi-select), stores a copy in /Pictures and inserts the right snippet at the cursor for the active language (<img> for HTML, background-image for CSS, new Image() for JS, an honest comment for C/C++/C#).
- Visual Code: new Sound block "play sfx" (coin / boing / zap / blip / boom - real WebAudio synthesis, no audio files) and a VFX category (flash, screen shake, particle burst) - tap a block into the workspace like any other. Block-run engine and the JS code export both handle them. Fixed the leftover artifact labels in the blueprint palette.
