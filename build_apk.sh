#!/usr/bin/env bash
set -e

echo "=== Building MossyWoss APK ==="

# Set environment paths
SDK="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-/opt/android-sdk}}"
BT_DIR=$(ls -d "$SDK"/build-tools/* 2>/dev/null | sort -V | tail -1)
export PATH="$BT_DIR:$SDK/cmdline-tools/latest/bin:$PATH"
ANDROID_JAR=$(ls "$SDK"/platforms/*/android.jar 2>/dev/null | sort -V | tail -1)
LIBS_DIR="$SDK/libs"
mkdir -p "$LIBS_DIR"
# Fetch androidx libs if not present (needed on fresh CI runners)
if [ ! -f "$LIBS_DIR/webkit-1.10.0.jar" ]; then
  echo "Downloading androidx libraries..."
  curl -sfL -o "$LIBS_DIR/webkit-1.10.0.aar" https://dl.google.com/android/maven2/androidx/webkit/webkit/1.10.0/webkit-1.10.0.aar
  curl -sfL -o "$LIBS_DIR/core-1.12.0.aar" https://dl.google.com/android/maven2/androidx/core/core/1.12.0/core-1.12.0.aar
  curl -sfL -o "$LIBS_DIR/annotation-jvm-1.6.0.jar" https://dl.google.com/android/maven2/androidx/annotation/annotation-jvm/1.6.0/annotation-jvm-1.6.0.jar
  for aar in webkit-1.10.0 core-1.12.0; do
    unzip -o -q "$LIBS_DIR/$aar.aar" classes.jar -d "$LIBS_DIR"
    mv "$LIBS_DIR/classes.jar" "$LIBS_DIR/$aar.jar"
  done
fi
if [ ! -f "$LIBS_DIR/core-1.12.0.jar" ]; then
  unzip -o -q "$LIBS_DIR/core-1.12.0.aar" classes.jar -d "$LIBS_DIR" && mv "$LIBS_DIR/classes.jar" "$LIBS_DIR/core-1.12.0.jar" 2>/dev/null || true
fi
for L in webkit-1.10.0.jar core-1.12.0.jar annotation-jvm-1.6.0.jar; do
  [ -s "$LIBS_DIR/$L" ] || { echo "MISSING LIBRARY: $LIBS_DIR/$L (download failed)"; exit 1; }
done
KEYSTORE="mwos-release.keystore"
KEY_ALIAS="mwos"
KEY_PASS="mwos-release-key"

# Copy latest HTML asset
cp mossywoss_os.html apk-build/assets/mossywoss_os.html

# Prepare build dirs
rm -rf apk-build/build apk-build/gen
mkdir -p apk-build/build/compiled_res apk-build/build/classes apk-build/gen

# 1. Compile resources with aapt2
echo "1. Compiling resources..."
aapt2 compile --dir apk-build/res -o apk-build/build/compiled_res.zip

# 2. Link resources with aapt2
echo "2. Linking resources and generating base APK + R.java..."
aapt2 link -o apk-build/build/base.apk \
    --manifest apk-build/AndroidManifest.xml \
    -I "$ANDROID_JAR" \
    -A apk-build/assets \
    apk-build/build/compiled_res.zip \
    --java apk-build/gen \
    --min-sdk-version 24 \
    --target-sdk-version 34

# 3. Compile Java sources
echo "3. Compiling Java sources..."
JAVA_CLASSES=$(find apk-build/java apk-build/gen -name "*.java")
javac -source 17 -target 17 \
    -classpath "$ANDROID_JAR:$LIBS_DIR/webkit-1.10.0.jar:$LIBS_DIR/core-1.12.0.jar:$LIBS_DIR/annotation-jvm-1.6.0.jar" \
    -d apk-build/build/classes \
    $JAVA_CLASSES

# 4. Dex bytecode with d8
echo "4. Converting bytecode to classes.dex with d8..."
CLASS_FILES=$(find apk-build/build/classes -name "*.class")
d8 --release --lib "$ANDROID_JAR" \
    --output apk-build/build/ \
    $CLASS_FILES \
    "$LIBS_DIR/webkit-1.10.0.jar" \
    "$LIBS_DIR/core-1.12.0.jar" \
    "$LIBS_DIR/annotation-jvm-1.6.0.jar"

# 5. Add classes.dex to base.apk
echo "5. Assembling classes.dex into base APK..."
(cd apk-build/build && zip -u -j base.apk classes.dex)

# 6. Zipalign APK
echo "6. Aligning APK with zipalign..."
zipalign -f 4 apk-build/build/base.apk apk-build/build/aligned.apk

# 7. Generate keystore if missing & Sign APK
if [ ! -f "$KEYSTORE" ]; then
    echo "Generating release keystore..."
    keytool -genkeypair -keystore "$KEYSTORE" \
        -storepass "$KEY_PASS" -alias "$KEY_ALIAS" -keypass "$KEY_PASS" \
        -keyalg RSA -keysize 4096 -validity 36500 \
        -dname "CN=MossyWoss OS, OU=foxydev109-ux, O=foxydev109-ux, L=Sydney, ST=NSW, C=AU"
fi

echo "7. Signing APK with apksigner..."
apksigner sign \
    --ks "$KEYSTORE" --ks-pass pass:"$KEY_PASS" --ks-key-alias "$KEY_ALIAS" \
    --key-pass pass:"$KEY_PASS" \
    --v1-signing-enabled true --v2-signing-enabled true --v3-signing-enabled true \
    --out mossywoss.apk \
    apk-build/build/aligned.apk

# 8. Verify APK
echo "8. Verifying APK..."
apksigner verify --verbose --min-sdk-version 24 --max-sdk-version 35 mossywoss.apk
# resources.arsc MUST be uncompressed (stored) for targetSdk 30+ installers
unzip -v mossywoss.apk | grep "resources.arsc" | grep -q "Stored" || { echo "ERROR: resources.arsc must be Stored"; exit 1; }
echo "resources.arsc is Stored (installer-safe)"


# 9. Install-readiness gate: fail the build rather than ship an APK Android may refuse
echo "9. Install-readiness checks..."
fail() { echo "INSTALL-GATE FAILED: $1"; exit 1; }
BADGING=$(aapt2 dump badging mossywoss.apk 2>/dev/null)
echo "$BADGING" | grep -q "package: name='com.foxydev109ux.mwos'" || fail "unexpected package name"
echo "$BADGING" | grep -q "sdkVersion:'24'" || fail "minSdk not 24"
echo "$BADGING" | grep -q "application-label:'MossyWoss OS'" || fail "missing app label"
echo "$BADGING" | grep -q "application-icon" || fail "missing launcher icon"
echo "$BADGING" | grep -q "launchable-activity: name='com.foxydev109ux.mwos.MainActivity'" || fail "launcher activity missing"
unzip -v mossywoss.apk | grep "resources.arsc" | grep -q "Stored" || fail "resources.arsc must be stored"
zipalign -c -P 16 4 mossywoss.apk 2>/dev/null || zipalign -c 4 mossywoss.apk || fail "APK not aligned"
SIGN=$(apksigner verify --verbose --print-certs mossywoss.apk 2>&1)
echo "$SIGN" | grep -q "v2 scheme (APK Signature Scheme v2): true" || fail "v2 signature missing"
echo "$SIGN" | grep -q "v3 scheme (APK Signature Scheme v3): true" || fail "v3 signature missing"
echo "$SIGN" | grep -q "CN=Android Debug" && fail "still signed with generic debug identity"
jarsigner -verify mossywoss.apk 2>&1 | grep -q "jar verified" || fail "v1 (jar) signature invalid"
# every Java class referenced by the manifest must exist in classes.dex
unzip -p mossywoss.apk classes.dex | strings | grep -q "com/foxydev109ux/mwos/MainActivity" || fail "MainActivity not in dex"
echo "All install-readiness checks passed."

echo "=== Build Successful! Final APK: mossywoss.apk ==="
