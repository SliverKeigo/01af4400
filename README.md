# 跟读助手 (Text-to-Voice)

一个基于 Tauri + React + TailwindCSS 的跟读任务桌面客户端，集成 sherpa-onnx SenseVoice 离线语音识别模型。

## 功能

- 创建跟读任务，支持中文、英文、日语、韩语、粤语
- 按行分割文本，逐句跟读练习
- 浏览器录音 + 离线语音识别
- 每句最多保存 2 条识别记录
- 任务数据持久化，重启不丢失

## 环境要求

- Node.js >= 18
- Rust >= 1.70
- 系统依赖：参考 [Tauri Prerequisites](https://tauri.app/start/prerequisites/)

## 安装与运行

```bash
# 安装前端依赖
npm install

# 开发模式运行
npm run tauri dev
```

## 自测步骤

1. 启动应用后进入任务列表页（空白）
2. 点击「+ 创建任务」进入创建页
3. 输入标题（可选），选择语种，输入多行文本
4. 点击「创建任务」跳转到任务详情页
5. 在详情页点击某句的「录音」按钮
6. 对着麦克风朗读，点击「停止录音」
7. 查看识别结果，选择「保存」或「丢弃重录」
8. 验证每句最多 2 条记录，满 2 条时提示已达上限
9. 返回任务列表，验证进度显示
10. 删除任务时需二次确认
11. 重启应用验证数据持久化

## 模型下载与放置

当前使用 mock 识别（返回模拟文本），实际模型集成需以下步骤：

### 下载模型

参考页面：https://k2-fsa.github.io/sherpa/onnx/sense-voice/pretrained.html#sherpa-onnx-sense-voice-zh-en-ja-ko-yue-int8-2025-09-09-chinese-english-japanese-korean-cantonese

```bash
# 下载模型包
wget https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/sherpa-onnx-sense-voice-zh-en-ja-ko-yue-int8-2025-09-09.tar.bz2

# 解压
tar xvf sherpa-onnx-sense-voice-zh-en-ja-ko-yue-int8-2025-09-09.tar.bz2
```

### 放置模型文件

将解压后的目录放在应用可访问的位置。模型目录应包含：

- `model.int8.onnx` — 模型文件
- `tokens.txt` — token 列表

### 模型加载失败排查

- 确认模型文件完整且未损坏
- 确认路径正确且应用有读取权限
- 若模型加载失败，应用会回退到 mock 模式，UI 流程仍可使用

## 技术栈

- **前端**：React + TypeScript + TailwindCSS v4 + React Router
- **后端**：Tauri v2 + Rust
- **语音识别**：sherpa-onnx SenseVoice（计划集成）
- **数据持久化**：JSON 文件存储（应用数据目录）

## 常见问题

**Q: 录音没有反应？**
A: 请确保浏览器/应用已授权麦克风权限。

**Q: 识别结果是固定文本？**
A: 当前版本使用 mock 识别。集成真实模型后会返回实际识别结果。

**Q: 数据存在哪里？**
A: macOS 上存储在 `~/Library/Application Support/com.keigo.text-to-voice/tasks.json`。
