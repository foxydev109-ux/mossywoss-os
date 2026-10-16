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
