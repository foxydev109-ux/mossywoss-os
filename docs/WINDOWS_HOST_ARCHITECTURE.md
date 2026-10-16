# MossyWoss OS Windows Host - Architecture & Test Plan (real)

Prereq note (honest): this sandbox cannot compile or run native Windows
binaries, so requirement 10 applies: the host ships as real, runnable source
(host/mwo_host.py + allowlist) and the browser client ships fully working.
Testing against real Windows 10/11 happens on real hardware before ANY app
is claimed as compatible (requirement 9).

## Architecture
```
+---------------------------+        WebSocket (ws://ip:8765)      +-----------------------------+
|  MossyWoss OS (browser)   | -----------------------------------> |  Windows Host (mwo_host.py)  |
|  Host Link app            |   1 auth token  2 allowlist          |  - token auth (1-time)       |
|  - connect / disconnect   |   3 launch request  4 result        |  - allowlist.json ONLY       |
|  - allowlist view         |                                     |  - y/n consent AT the PC     |
|  - request launch         |                                     |  - Popen(path) from list     |
+---------------------------+                                     +-----------------------------+
        |                                                                       |
   Host Link window                                                allowlist.json (user-edited)
   shows status/result. No shell, no filesystem browsing, no arbitrary
   process spawn ever crosses this line (requirements 3, 4, 5).
```

## App origin states (requirement 6)
- Browser apps: run inside MWO (HTML5 runtime).
- Emulated apps: run in the OS Lab's in-browser retro environments.
- Host apps: run on the Windows PC; the OS only requests them and shows the
  host's honest result. The Host Link UI labels these "Host (on your PC)".

## Security model
- One-time token printed on the host console (user retypes it in the OS).
- Every launch request must be consented (y/n) by a person at the PC.
- Only IDs listed in allowlist.json can ever be requested; paths are never
  sent by the browser, never executed from browser input.
- Disconnect control on both ends; all states visible in the UI.

## Test matrix (run on real Windows hardware, then record results)
1. pip install websockets; python mwo_host.py on the PC.
2. OS: Host Link -> ws://<pc-ip>:8765 + token -> expect "connected".
3. Request "notepad" (the harmless first app, requirement 7): approve at PC
   -> expect Notepad opens, UI shows "host launched the program".
4. Deny at PC -> expect UI shows "denied by user at host".
5. Bad token -> expect auth error.
6. Only after 1-5 pass: individually test Roblox / Unity Editor / Unreal
   Engine 5 on the PC, adding each to allowlist, and only then claim support.

## Limitations (honest)
- No streaming of the app's display into the OS (remote desktop/screen
  sharing is a later milestone); the OS only launches + reports.
- LAN only; host and OS must be on the same network; firewall must allow 8765.
- WebSockets from a page served over https (e.g. GitHub Pages) to ws:// are
  blocked by browsers as mixed content: run the local HTML build (file:// or
  the web zip served from http) for Host Link, or upgrade the host to wss://.
