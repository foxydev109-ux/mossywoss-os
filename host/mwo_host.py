#!/usr/bin/env python3
"""MossyWoss OS Windows Host (real, minimal, secure-by-default).

Runs on your Windows 10/11 PC. The browser OS connects over an authenticated
WebSocket and can REQUEST an allowlisted application. Every launch requires
explicit y/n consent typed at this console. No shell access, no arbitrary
paths, no filesystem browsing is ever exposed to the browser.

Prereqs: Python 3.9+, then:  pip install websockets
Run:      python mwo_host.py
Then in the OS: open Host Link, use ws://<this-pc-ip>:8765 + the token shown.
"""
import asyncio, json, secrets, subprocess, sys
try:
    import websockets
except ImportError:
    sys.exit("Missing dependency. Run: pip install websockets")

ALLOWLIST_FILE = "allowlist.json"   # {"apps":[{"id":"notepad","name":"Notepad","path":"C:\\\\Windows\\\\System32\\\\notepad.exe"}]}
LISTEN_PORT = 8765

def load_allowlist():
    try:
        with open(ALLOWLIST_FILE, "r", encoding="utf-8") as f:
            return json.load(f).get("apps", [])
    except FileNotFoundError:
        return []

async def handle(ws):
    token = secrets.token_urlsafe(4)
    print(f"[host] client connected; ask them to enter token: {token}")
    try:
        msg = json.loads(await ws.recv())
        if msg.get("type") != "auth" or msg.get("token") != token:
            await ws.send(json.dumps({"type": "error", "error": "auth failed"}))
            return
        await ws.send(json.dumps({"type": "status", "state": "connected"}))
        apps = load_allowlist()
        await ws.send(json.dumps({"type": "allowlist", "apps": [{"id": a["id"], "name": a.get("name", a["id"])} for a in apps]}))
        async for raw in ws:
            msg = json.loads(raw)
            if msg.get("type") != "launch":
                continue
            app = next((a for a in apps if a["id"] == msg.get("appId")), None)
            if not app:
                await ws.send(json.dumps({"type": "launch_result", "ok": False, "error": "not in allowlist"}))
                continue
            consent = input(f"[host] allow launching '{app['name']}'? y/n: ").strip().lower()
            if consent != "y":
                await ws.send(json.dumps({"type": "launch_result", "ok": False, "error": "denied by user at host"}))
                continue
            try:
                subprocess.Popen([app["path"]], start_new_session=True)
                await ws.send(json.dumps({"type": "launch_result", "ok": True, "app": app["id"]}))
            except Exception as e:
                await ws.send(json.dumps({"type": "launch_result", "ok": False, "error": str(e)}))
    finally:
        print("[host] client disconnected")

async def main():
    async with websockets.serve(handle, "0.0.0.0", LISTEN_PORT):
        print(f"[host] MossyWoss OS host listening on port {LISTEN_PORT}")
        await asyncio.Future()

if __name__ == "__main__":
    asyncio.run(main())
