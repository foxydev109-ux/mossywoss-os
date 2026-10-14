#!/usr/bin/env bash
# Offline APK install-readiness check (what an installer enforces that we CAN test
# without a phone). Honest limit: cannot emulate Play Protect's reputation system.
set -e
APK="${1:-mossywoss.apk}"
export PATH="$PATH:${ANDROID_HOME:-/opt/android-sdk}/build-tools/34.0.0"
pass=0; fail=0
ok(){ echo "PASS $1"; pass=$((pass+1)); }
no(){ echo "FAIL $1"; fail=$((fail+1)); }
B=$(aapt2 dump badging "$APK" 2>/dev/null)
echo "$B" | grep -q "package: name='com.foxydev109ux.mwos'" && ok "package name" || no "package name"
echo "$B" | grep -qE "versionCode='[0-9]+'" && ok "versionCode present" || no "versionCode"
echo "$B" | grep -q "sdkVersion:'24'" && ok "minSdk 24 (Android 7+)" || no "minSdk"
echo "$B" | grep -qE "targetSdkVersion:'(34|35)'" && ok "targetSdk >= 34 (Android 15 compliant)" || no "targetSdk"
echo "$B" | grep -q "launchable-activity" && ok "launcher activity" || no "launcher activity"
echo "$B" | grep -q "application-icon" && ok "launcher icon" || no "icon"
unzip -v "$APK" | grep resources.arsc | grep -q Stored && ok "resources.arsc stored" || no "resources.arsc"
zipalign -c 4 "$APK" >/dev/null 2>&1 && ok "zip aligned" || no "alignment"
S=$(apksigner verify --verbose --print-certs "$APK" 2>&1)
echo "$S" | grep -q "^Verifies" && ok "signature verifies" || no "signature"
echo "$S" | grep -q "scheme (APK Signature Scheme v2): true" && ok "v2 signed" || no "v2"
echo "$S" | grep -q "scheme (APK Signature Scheme v3): true" && ok "v3 signed" || no "v3"
jarsigner -verify "$APK" 2>&1 | grep -q "jar verified" && ok "v1 (jar) signed" || no "v1"
echo "$S" | grep -q "CN=Android Debug" && no "generic debug identity" || ok "not signed with generic debug identity"
# signer identity must equal the committed keystore (stable identity => clean updates)
K=$(keytool -list -keystore mwos-release.keystore -storepass mwos-release-key 2>/dev/null | grep -i "SHA-256" | sed 's/.*: //;s/://g' | tr 'A-F' 'a-f')
A=$(echo "$S" | grep "SHA-256 digest" | head -1 | sed 's/.*: //')
[ -n "$K" ] && [ "$K" = "$A" ] && ok "signer == committed keystore identity" || no "signer identity mismatch"
unzip -p "$APK" assets/mossywoss_os.html | head -c 200 | grep -qi "<!DOCTYPE html" && ok "bundled OS is present" || no "bundled OS"
echo "=== APK INSTALL CHECK: $pass passed, $fail failed ==="
[ $fail -eq 0 ]
