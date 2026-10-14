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
  curl -sfL -o "$LIBS_DIR/annotation-1.6.0.jar" https://dl.google.com/android/maven2/androidx/annotation/annotation/1.6.0/annotation-1.6.0.jar
  for aar in webkit-1.10.0 core-1.12.0; do
    unzip -o -q "$LIBS_DIR/$aar.aar" classes.jar -d "$LIBS_DIR"
    mv "$LIBS_DIR/classes.jar" "$LIBS_DIR/$aar.jar"
  done
fi
if [ ! -f "$LIBS_DIR/core-1.12.0.jar" ]; then
  unzip -o -q "$LIBS_DIR/core-1.12.0.aar" classes.jar -d "$LIBS_DIR" && mv "$LIBS_DIR/classes.jar" "$LIBS_DIR/core-1.12.0.jar" 2>/dev/null || true
fi
KEYSTORE="debug.keystore"

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
    echo "Generating debug keystore..."
    keytool -genkey -v -keystore "$KEYSTORE" \
        -storepass android -alias androiddebugkey -keypass android \
        -keyalg RSA -keysize 2048 -validity 10000 \
        -dname "CN=Android Debug,O=Android,C=US"
fi

echo "7. Signing APK with apksigner..."
apksigner sign --ks "$KEYSTORE" \
    --ks-pass pass:android \
    --key-pass pass:android \
    --out mossywoss.apk \
    apk-build/build/aligned.apk

# 8. Verify APK
echo "8. Verifying APK..."
apksigner verify --verbose mossywoss.apk

echo "=== Build Successful! Final APK: mossywoss.apk ==="
