# MossyWoss OS v1.1.0 - "Clean Sweep" - Official Release Notes

MossyWoss OS is a complete web-based operating system in a single HTML file: 87 original apps and games, a real code studio, animation studio, game builder, AI platform and in-OS store. Local-first, free, MIT licensed.

## Highlights

- **Real search in the Browser**: results now lead with a prominent "Search Google (new tab)" action plus DuckDuckGo, with live instant answers and a dedicated Wikipedia section.
- **Brand-clean product**: every real-world brand name removed from the OS UI - OS Lab entries are now generic descriptions with license-only owner lines; full attribution stays in the repo NOTICE file.
- **Smarter Files**: double-click now does the right thing per type - .exe opens the PE Inspector, .zip extracts in-OS, images preview in a window. New Folder, New File and Rename (native VFS rename with fallback) included.
- **Code Studio**: switching to C/C++/C# now genuinely swaps the editor and runs it on the built-in interpreter; static class methods (e.g. Calc.Square) fixed; "Insert Image" imports images and inserts the right snippet per language.
- **Animation Studio**: import image sequences as real frame animations with adjustable frame duration, onion-skin ghosts of neighbouring frames, and per-frame PNG export.
- **Visual Code**: new SFX blocks (coin/boing/zap/blip/boom, synthesized live with WebAudio) and VFX blocks (flash, shake, particle burst), working in both the block engine and JS export.
- **Game Builder Kit + Store**: build, test, MossGuard-scan and publish your own games to the MWO Store; store categories (Games/Coding/Creative/AI/Tools) and user-content developer labels fixed.
- **Performance**: Voxely chunk generation optimized, movement drift on key release fixed, game key listeners cleaned up on window close.
- **Android APK**: signed with a dedicated release key (v1+v2+v3), passes a 15-point install-readiness check; Play-Protect-style warnings are reputation-based, not a fault of the app.

## Fixes and polish

- Session/game-over flow: windowed resets, auto-restore and a Sign Out button.
- Artifacts purge: doubled-word labels and stray characters removed OS-wide.
- Honest limitations preserved: PC programs (.exe) are inspected, not executed; deep-linked projects in OS Lab stay attributed to their owners.

## Install

- Any modern browser: open mossywoss_os.html (or the itch.io playable build).
- Windows / Linux: extract the zip and open the HTML.
- Android: install mossywoss.apk (allow installs from your chosen source if prompted).
