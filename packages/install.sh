#!/usr/bin/env bash
# MossyWoss OS — Linux installer
# Installs for the current user: no root required, works on any distro with xdg-open.
set -e

SHARE_DIR="$HOME/.local/share/mossywoss-os"
BIN_DIR="$HOME/.local/bin"
APPS_DIR="$HOME/.local/share/applications"
SRC="$(cd "$(dirname "$0")" && pwd)/mossywoss_os.html"

[ ! -f "$SRC" ] && { echo "Error: mossywoss_os.html not found next to install.sh"; exit 1; }

echo "Installing MossyWoss OS for user $(whoami)..."

mkdir -p "$SHARE_DIR" "$BIN_DIR" "$APPS_DIR"
cp "$SRC" "$SHARE_DIR/mossywoss_os.html"

# Launcher command
cat > "$BIN_DIR/mossywoss" << LAUNCHER
#!/usr/bin/env bash
exec xdg-open "$HOME/.local/share/mossywoss-os/mossywoss_os.html"
LAUNCHER
chmod +x "$BIN_DIR/mossywoss"
echo "  [ok] command: mossywoss (in ~/.local/bin)"

# Menu entry
cat > "$APPS_DIR/mossywoss-os.desktop" << DESKTOP
[Desktop Entry]
Type=Application
Name=Mossy Woss OS
Comment=Web-based local-first operating system in a single file
Exec=$BIN_DIR/mossywoss
Icon=$SHARE_DIR/icon.png
Terminal=false
Categories=Game;Utility;
DESKTOP
echo "  [ok] menu entry: Mossy Woss OS"

# Icon (embedded 32x32 PNG, moss-green square with white fox glyph)
python3 - "$SHARE_DIR/icon.png" << 'PYEOF'
import sys, zlib, struct
def chunk(t, d): return struct.pack('>I', len(d)) + t + d + struct.pack('>I', zlib.crc32(t + d) & 0xffffffff)
W = H = 32
px = bytearray()
for y in range(H):
    px.append(0)
    for x in range(W):
        inside = 4 <= x <= 27 and 4 <= y <= 27
        fox = (6 <= x <= 11 or 20 <= x <= 25) and 5 <= y <= 11 \
              or (12 <= x <= 19 and 9 <= y <= 13) \
              or (14 <= x <= 17 and 13 <= y <= 18) \
              or (9 <= x <= 13 and 20 <= y <= 24) or (18 <= x <= 22 and 20 <= y <= 24)
        if inside and fox:
            px += b'\xf5\xf5\xf5\xff'
        elif inside:
            px += b'\x2e\x7d\x4f\xff'
        else:
            px += b'\x1b\x1b\x24\xff'
png = b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', W, H, 8, 6, 0, 0, 0)) \
    + chunk(b'IDAT', zlib.compress(bytes(px), 9)) + chunk(b'IEND', b'')
open(sys.argv[1], 'wb').write(png)
PYEOF
echo "  [ok] icon installed"

if command -v xdg-open >/dev/null 2>&1; then
  echo "  [ok] xdg-open found"
else
  echo "  [note] xdg-open not found here — open $SHARE_DIR/mossywoss_os.html in any browser instead."
fi

echo
echo "Done. Launch with:  mossywoss   (or find 'Mossy Woss OS' in your app menu)"
echo "Files live in:      $SHARE_DIR"
echo "Re-running this installer safely updates an existing install."
