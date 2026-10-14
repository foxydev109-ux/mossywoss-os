#!/usr/bin/env bash
# Builds the downloadable packages for MossyWoss OS into dist/
set -e
cd "$(dirname "$0")/.."

[ -f mossywoss_os.html ] || { echo "Error: build the OS first (python3 mw_assemble.py)"; exit 1; }
mkdir -p dist

# Windows package
rm -f dist/mossywoss-os-windows.zip
zip -q -j dist/mossywoss-os-windows.zip mossywoss_os.html packages/INSTALL-WINDOWS.txt
echo "  built dist/mossywoss-os-windows.zip"

# Linux package
rm -f dist/mossywoss-os-linux.zip
zip -q -j dist/mossywoss-os-linux.zip mossywoss_os.html packages/install.sh packages/uninstall.sh packages/README-LINUX.txt
echo "  built dist/mossywoss-os-linux.zip"

# Any-device web package
rm -f dist/mossywoss-os-web.zip
zip -q -j dist/mossywoss-os-web.zip mossywoss_os.html
echo "  built dist/mossywoss-os-web.zip"

ls -la dist/
