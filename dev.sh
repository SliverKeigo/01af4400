#!/bin/bash
# 开发模式启动脚本
# 设置 sherpa-onnx 库路径

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
export SHERPA_ONNX_LIB_DIR="$SCRIPT_DIR/sherpa-onnx-v1.12.29-osx-universal2-shared-no-tts/lib"
export DYLD_LIBRARY_PATH="$SHERPA_ONNX_LIB_DIR${DYLD_LIBRARY_PATH:+:$DYLD_LIBRARY_PATH}"

echo "[跟读助手] SHERPA_ONNX_LIB_DIR=$SHERPA_ONNX_LIB_DIR"

npm run tauri dev
