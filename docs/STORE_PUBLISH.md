# MWO Store and publishing pipeline (real, tested)

This documents how the MWO Store and its publishing pipeline actually work.
Every step below is covered by an automated test (see "Tests" at the end);
nothing here is a mock-up.

## How the Store itself works

```
MWO Store app (in-OS)
   |  reads the installed-app registry + published-item records
   v
+-----------------------------------------------------------+
| store card: name, author info, size, [Install] [Open]     |
|   pre-made system apps+games  -> NO developer label       |
|   user-published items        -> "Developer: <username>" |
+-----------------------------------------------------------+
   | Install (from Store)
   v
MWO extractor opens the package zip (real PK/EOCD records)
   -> content written into the in-browser VFS (ArrayBuffer-safe)
   -> app appears in the launcher and runs
```

- The Store never writes to your device's storage. Everything installs
  inside the browser's virtual file system (local-first, sandboxed).
- "Fresh PC" installs exactly 3 icons: nothing from the Store is preinstalled.

## Publishing user content (Game Builder Kit / Code Studio)

```
author code in-OS (HTML/CSS/JS)
   -> Test Run (live preview in the OS)
   -> Build: MWO.ZipBuilder.buildZip
        real ZIP: local file headers + central directory + EOCD,
        CRC32 per entry, stored + deflate-raw compression
   -> MWO.Publisher.openWithZip(staged File)
        (no device file picker needed - the zip never touches storage)
   -> MossGuard static scan of the archive
   -> mandatory: rules acknowledged + ownership disclaimer filled
   -> publish: store record created
   -> card shows "Developer: <logged-in MWO username>"
```

## MossGuard scan (publisher.js)

Checks every entry in the published archive before it can be published:
size and entry-count limits, no path traversal (`..`), no absolute paths,
no executable/native payloads, no remote-code loaders (documented list),
ASCII-safe file names. A failed scan blocks publishing.

## Android package (the APK that ships this OS)

```
WebView shell (com.foxydev109ux.mwos)
   -> loads assets/mossywoss_os.html via WebViewAssetLoader
   -> served from https://appassets.androidplatform.net (secure origin,
      so localStorage/IndexedDB + all browser APIs work)
   -> file access, camera and microphone routed through Android
      permission requests when the OS asks for them
```

The APK is built by `build_apk.sh` with a pinned toolchain
(build-tools 34.0.0, platform android-34) so CI and local builds are
byte-for-byte identical in behavior. Before any release, the build runs an
install-readiness gate and `tests/apk_install_check.sh` runs 15 offline
installer checks. Signing: one committed release key
(`mwos-release.keystore`, CN=MossyWoss OS), so updates install cleanly.

## Tests (all green in CI)

- tests/publisher_storetest.js: 4/4 (publish contract, developer tag,
  disclaimer enforcement, pre-made items carry no developer label)
- tests/gamebuilder_test.js: 9/9 (zip round-trip: built zip re-opened by
  the OS's own extractor, content intact)
- tests/apk_install_check.sh: 15/15 offline install-readiness checks

## Storage layout (in-browser VFS)

```
/System/store/uploads/<id>/      staged upload folders (zip/folder in progress)
/System/store/published/<id>.json  published item records
/WebApps/<app-dir>/              extracted content of installed apps
```

A published record contains: name (sanitized), category (`app` or `game`),
icon, publisher (the logged-in MWO username, fallback `mwo-user`),
publishedAt timestamp, and the file reference. The Store sorts items by
publishedAt (newest first). The Publish Studio has two tabs: `publish` and
`my published` (manage/delete your own items).

## What MossGuard actually checks (MWO.Sec, sec.js)

Static heuristic scan of every file in the archive/folder, before publish
and again before run for HTML5 games (sandbox-escape scan):

- EICAR test-file detection (real AV industry test signature)
- PE executable validation: `.exe`/`.scr` must have a valid MZ header;
  truncated or headerless executables are flagged as corrupt/obfuscated
- Native/ELF payloads, path traversal (`..`), absolute paths
- Remote-code loader patterns (documented list, local static analysis)
- File-size and entry-count limits, ASCII-safe file names

Findings carry a severity. High-severity findings block publishing
completely; medium-severity findings are shown and must be explicitly
acknowledged. A clean scan reports the file count and 0 high/medium
threats. Honest limit (shown to users in the UI too): a local static
scanner cannot guarantee 100% detection of anything.

## Publishing checklist (what you go through in the UI)

1. Build in Game Builder Kit or import a zip/folder in Publish Studio
2. Entry point `index.html` is verified inside the archive
3. MossGuard scan runs on every file
4. High-severity findings: publish blocked
5. Medium-severity findings: shown, require acknowledgement
6. Publishing rules must be acknowledged and the ownership disclaimer
   filled in (published items are your responsibility, personal use)
7. Publish: record written to `/System/store/published/<id>.json`
8. Store card shows `Developer: <your MWO username>` on your item

## Troubleshooting

- "Missing index.html" - the archive must have `index.html` at its root
- Publish button disabled - rules acknowledgement or disclaimer not done
- Installed app does not appear - check Developer, Console for extractor
  errors; installs live only in the in-browser VFS, never device storage

See also: docs/FINAL_FIX_RECORD.md for the Android install saga and the
exact final install steps.
