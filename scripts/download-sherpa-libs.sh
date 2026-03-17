#!/bin/bash
set -euo pipefail

SHERPA_VERSION="v1.12.29"
BASE_URL="https://github.com/k2-fsa/sherpa-onnx/releases/download/${SHERPA_VERSION}"

OS="${1:-$(uname -s)}"
ARCH="${2:-$(uname -m)}"

case "$OS" in
  Darwin|macos)
    ARCHIVE="sherpa-onnx-${SHERPA_VERSION}-osx-universal2-shared-no-tts.tar.bz2"
    EXTRACT_DIR="sherpa-onnx-${SHERPA_VERSION}-osx-universal2-shared-no-tts"
    ;;
  Linux|linux)
    if [ "$ARCH" = "aarch64" ] || [ "$ARCH" = "arm64" ]; then
      ARCHIVE="sherpa-onnx-${SHERPA_VERSION}-linux-aarch64-shared-no-tts.tar.bz2"
      EXTRACT_DIR="sherpa-onnx-${SHERPA_VERSION}-linux-aarch64-shared-no-tts"
    else
      ARCHIVE="sherpa-onnx-${SHERPA_VERSION}-linux-x86_64-shared-no-tts.tar.bz2"
      EXTRACT_DIR="sherpa-onnx-${SHERPA_VERSION}-linux-x86_64-shared-no-tts"
    fi
    ;;
  MINGW*|MSYS*|Windows*|windows)
    ARCHIVE="sherpa-onnx-${SHERPA_VERSION}-win-x64-shared-no-tts.tar.bz2"
    EXTRACT_DIR="sherpa-onnx-${SHERPA_VERSION}-win-x64-shared-no-tts"
    ;;
  *)
    echo "Unsupported OS: $OS"
    exit 1
    ;;
esac

DEST="sherpa-onnx-libs"

if [ -d "$DEST/lib" ]; then
  echo "sherpa-onnx libs already exist at $DEST/lib"
  exit 0
fi

echo "Downloading $ARCHIVE ..."
curl -L -o "/tmp/$ARCHIVE" "${BASE_URL}/${ARCHIVE}"

echo "Extracting..."
mkdir -p "$DEST"
tar xf "/tmp/$ARCHIVE" -C /tmp/
cp -r "/tmp/${EXTRACT_DIR}/lib" "$DEST/lib"

# Windows: libs are in bin/ not lib/
if [ -d "/tmp/${EXTRACT_DIR}/bin" ]; then
  cp -r "/tmp/${EXTRACT_DIR}/bin/"*.dll "$DEST/lib/" 2>/dev/null || true
fi

rm -rf "/tmp/$ARCHIVE" "/tmp/${EXTRACT_DIR}"

echo "Done. Libs at: $DEST/lib"
ls "$DEST/lib/"
