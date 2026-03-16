# 跟读助手 (Text-to-Voice)

一个基于 Tauri + React + TailwindCSS 的跟读任务桌面客户端，集成 sherpa-onnx SenseVoice 离线语音识别模型。

## 功能

- 创建跟读任务，支持中文、英文、日语、韩语、粤语
- 按行分割文本，逐句跟读练习
- 浏览器录音 + sherpa-onnx SenseVoice 离线语音识别
- 每句最多保存 2 条识别记录
- 任务数据持久化，重启不丢失

## 环境要求

- Node.js >= 18
- Rust >= 1.70
- 系统依赖：参考 [Tauri Prerequisites](https://tauri.app/start/prerequisites/)

## 安装与运行

### 1. 安装前端依赖

```bash
npm install
```

### 2. 下载 sherpa-onnx 预编译库（macOS）

```bash
# 下载 macOS universal2 共享库（无 TTS）
wget https://github.com/k2-fsa/sherpa-onnx/releases/download/v1.12.29/sherpa-onnx-v1.12.29-osx-universal2-shared-no-tts.tar.bz2

# 解压到项目根目录
tar xf sherpa-onnx-v1.12.29-osx-universal2-shared-no-tts.tar.bz2
```

### 3. 下载 SenseVoice 模型

参考页面：https://k2-fsa.github.io/sherpa/onnx/sense-voice/pretrained.html

```bash
# 下载模型（以下二选一）

# 标准版
wget https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/sherpa-onnx-sense-voice-zh-en-ja-ko-yue-2024-07-17.tar.bz2
tar xf sherpa-onnx-sense-voice-zh-en-ja-ko-yue-2024-07-17.tar.bz2

# 或 int8 量化版（更小）
wget https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/sherpa-onnx-sense-voice-zh-en-ja-ko-yue-int8-2025-09-09.tar.bz2
tar xf sherpa-onnx-sense-voice-zh-en-ja-ko-yue-int8-2025-09-09.tar.bz2
```

模型目录应包含：
- `model.onnx`（或 `model.int8.onnx`）
- `tokens.txt`

### 4. 启动开发模式

```bash
# 使用启动脚本（自动设置库路径）
./dev.sh

# 或手动设置环境变量
export SHERPA_ONNX_LIB_DIR="$(pwd)/sherpa-onnx-v1.12.29-osx-universal2-shared-no-tts/lib"
export DYLD_LIBRARY_PATH="$SHERPA_ONNX_LIB_DIR:$DYLD_LIBRARY_PATH"
npm run tauri dev
```

## 项目目录结构

```
text-to-voice/
├── sherpa-onnx-sense-voice-zh-en-ja-ko-yue-2024-07-17/  # 模型目录
│   ├── model.onnx
│   └── tokens.txt
├── sherpa-onnx-v1.12.29-osx-universal2-shared-no-tts/   # 预编译库
│   └── lib/
│       ├── libsherpa-onnx-c-api.dylib
│       └── libonnxruntime.dylib
├── src/                # React 前端
├── src-tauri/          # Rust 后端
├── dev.sh              # 启动脚本
└── ...
```

## 自测步骤

1. 启动应用后进入任务列表页（空白）
2. 点击「+ 创建任务」进入创建页
3. 输入标题（可选），选择语种，输入多行文本
4. 点击「创建任务」跳转到任务详情页
5. 在详情页点击某句的「录音」按钮，允许麦克风权限
6. 对着麦克风朗读，点击「停止录音」
7. 等待识别完成，查看识别结果
8. 选择「保存」或「丢弃重录」
9. 验证每句最多 2 条记录，满 2 条时提示已达上限
10. 返回任务列表，验证进度显示
11. 删除任务时需二次确认
12. 重启应用验证数据持久化

## 技术栈

- **前端**：React + TypeScript + TailwindCSS v4 + React Router
- **后端**：Tauri v2 + Rust
- **语音识别**：sherpa-onnx SenseVoice（离线，支持中英日韩粤）
- **数据持久化**：JSON 文件存储（应用数据目录）

## 常见问题

**Q: 录音没有反应？**
A: 请确保应用已授权麦克风权限。macOS 上首次使用会弹出权限请求。

**Q: 模型加载失败？**
A: 检查以下几点：
- 模型目录是否在项目根目录下
- 模型文件（model.onnx 或 model.int8.onnx）和 tokens.txt 是否存在
- 启动时终端输出是否显示「模型加载成功」
- 若加载失败，应用会在任务详情页显示提示

**Q: 链接错误 `library 'sherpa-onnx-c-api' not found`？**
A: 确保设置了环境变量 `SHERPA_ONNX_LIB_DIR`，指向包含 `libsherpa-onnx-c-api.dylib` 的目录。使用 `./dev.sh` 启动可自动设置。

**Q: 数据存在哪里？**
A: macOS 上存储在 `~/Library/Application Support/com.keigo.text-to-voice/tasks.json`。
