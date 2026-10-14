#!/usr/bin/env bash
# Removes the per-user install of MossyWoss OS (safe: only touches its own paths).
set -e
DIR="$HOME/.local/share/mossywoss-os"
case "$DIR" in "$HOME/.local/share/mossywoss-os") ;; *) echo "unexpected path"; exit 1;; esac
rm -f "$HOME/.local/bin/mossywoss"
rm -f "$HOME/.local/share/applications/mossywoss-os.desktop"
if [ -d "$DIR" ]; then rm -r "$DIR"; fi
echo "Mossy Woss OS uninstalled. (Your saved OS data lives inside the browser that ran it — clearing that site's storage removes it.)"
