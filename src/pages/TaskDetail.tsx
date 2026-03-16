import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getTask, saveAttempt, deleteAttempt, recognizeAudio, getModelStatus } from "../lib/api";
import type { Task } from "../lib/types";
import { LANGUAGE_OPTIONS } from "../lib/types";
import { useRecorder } from "../lib/useRecorder";

type ItemUIState = "idle" | "recording" | "recognizing" | "preview";

export default function TaskDetail() {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const [task, setTask] = useState<Task | null>(null);
  const [error, setError] = useState("");
  const [activeItem, setActiveItem] = useState<number | null>(null);
  const [itemState, setItemState] = useState<ItemUIState>("idle");
  const [previewText, setPreviewText] = useState("");
  const [modelLoaded, setModelLoaded] = useState<boolean | null>(null);
  const recorder = useRecorder();

  const loadTask = useCallback(async () => {
    if (!taskId) return;
    try {
      const t = await getTask(taskId);
      setTask(t);
    } catch (err) {
      setError(String(err));
    }
  }, [taskId]);

  useEffect(() => {
    loadTask();
    getModelStatus().then(setModelLoaded).catch(() => setModelLoaded(false));
  }, [loadTask]);

  async function handleStartRecording(index: number) {
    setActiveItem(index);
    setItemState("recording");
    setPreviewText("");
    setError("");
    try {
      await recorder.start();
    } catch (err) {
      setError("无法访问麦克风: " + String(err));
      setItemState("idle");
      setActiveItem(null);
    }
  }

  async function handleStopRecording() {
    if (!task) return;
    setItemState("recognizing");
    try {
      const { samplesBase64, sampleRate } = recorder.stop();
      const text = await recognizeAudio(samplesBase64, sampleRate, task.language);
      setPreviewText(text);
      setItemState("preview");
    } catch (err) {
      setError("识别失败: " + String(err));
      setItemState("idle");
      setActiveItem(null);
    }
  }

  async function handleSave() {
    if (!task || activeItem === null) return;
    try {
      const updated = await saveAttempt(task.id, activeItem, previewText);
      setTask(updated);
      setItemState("idle");
      setActiveItem(null);
      setPreviewText("");
    } catch (err) {
      setError(String(err));
    }
  }

  function handleDiscard() {
    setItemState("idle");
    setActiveItem(null);
    setPreviewText("");
  }

  async function handleDeleteAttempt(itemIndex: number, attemptIndex: number) {
    if (!task) return;
    try {
      const updated = await deleteAttempt(task.id, itemIndex, attemptIndex);
      setTask(updated);
    } catch (err) {
      setError(String(err));
    }
  }

  if (!task) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        {error ? (
          <div className="text-red-500">{error}</div>
        ) : (
          <div className="text-gray-400">加载中...</div>
        )}
      </div>
    );
  }

  const completed = task.items.filter((i) => i.attempts.length > 0).length;
  const langLabel =
    LANGUAGE_OPTIONS.find((o) => o.value === task.language)?.label ??
    task.language;

  return (
    <div className="max-w-3xl mx-auto p-6">
      <button
        onClick={() => navigate("/")}
        className="text-gray-500 hover:text-gray-700 mb-4 inline-flex items-center gap-1 text-sm"
      >
        ← 返回列表
      </button>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">
          {task.title || "未命名任务"}
        </h1>
        <div className="flex items-center gap-3 mt-2 text-sm text-gray-500">
          <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md text-xs font-medium">
            {langLabel}
          </span>
          <span>
            进度 {completed} / {task.items.length}
          </span>
        </div>
        <div className="mt-2 w-full bg-gray-100 rounded-full h-2">
          <div
            className="bg-blue-500 h-2 rounded-full transition-all"
            style={{
              width: `${(completed / task.items.length) * 100}%`,
            }}
          />
        </div>
      </div>

      {modelLoaded === false && (
        <div className="bg-amber-50 text-amber-700 px-4 py-2.5 rounded-lg text-sm mb-4">
          语音识别模型未加载，录音识别功能不可用。请将模型放置在项目根目录。
        </div>
      )}

      {error && (
        <div className="bg-red-50 text-red-700 px-4 py-2.5 rounded-lg text-sm mb-4">
          {error}
          <button
            onClick={() => setError("")}
            className="ml-2 underline text-xs"
          >
            关闭
          </button>
        </div>
      )}

      <div className="space-y-4">
        {task.items.map((item, index) => {
          const isActive = activeItem === index;
          const hasMaxAttempts = item.attempts.length >= 2;

          return (
            <div
              key={index}
              className={`border rounded-xl p-4 transition-colors ${
                isActive
                  ? "border-blue-400 bg-blue-50/50"
                  : item.attempts.length > 0
                    ? "border-green-200 bg-green-50/30"
                    : "border-gray-200 bg-white"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 font-mono">
                      #{index + 1}
                    </span>
                    {item.attempts.length > 0 && (
                      <span className="w-2 h-2 rounded-full bg-green-500" />
                    )}
                  </div>
                  <p className="text-gray-800 mt-1 text-lg leading-relaxed">
                    {item.original_text}
                  </p>
                </div>

                {!isActive && (
                  <div>
                    {hasMaxAttempts ? (
                      <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">
                        已达上限，请先删除一条记录
                      </span>
                    ) : (
                      <button
                        onClick={() => handleStartRecording(index)}
                        disabled={activeItem !== null}
                        className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        录音
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Recording / Recognition / Preview controls */}
              {isActive && (
                <div className="mt-4 p-3 bg-white rounded-lg border border-blue-200">
                  {itemState === "recording" && (
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                        <span className="text-red-600 font-medium text-sm">
                          录音中...
                        </span>
                      </span>
                      <button
                        onClick={handleStopRecording}
                        className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors"
                      >
                        停止录音
                      </button>
                    </div>
                  )}
                  {itemState === "recognizing" && (
                    <div className="flex items-center gap-2 text-blue-600">
                      <svg
                        className="animate-spin h-4 w-4"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                          fill="none"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                        />
                      </svg>
                      <span className="text-sm font-medium">识别中...</span>
                    </div>
                  )}
                  {itemState === "preview" && (
                    <div>
                      <p className="text-sm text-gray-500 mb-1">识别结果：</p>
                      <p className="text-gray-800 bg-gray-50 p-2 rounded mb-3">
                        {previewText}
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={handleSave}
                          className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
                        >
                          保存
                        </button>
                        <button
                          onClick={handleDiscard}
                          className="px-4 py-2 bg-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-300 transition-colors"
                        >
                          丢弃重录
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Existing attempts */}
              {item.attempts.length > 0 && (
                <div className="mt-3 space-y-2">
                  {item.attempts.map((attempt, ai) => (
                    <div
                      key={ai}
                      className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 text-sm"
                    >
                      <div className="flex-1">
                        <span className="text-gray-700">{attempt.text}</span>
                        <span className="text-gray-400 ml-2 text-xs">
                          {new Date(attempt.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <button
                        onClick={() => handleDeleteAttempt(index, ai)}
                        className="text-gray-400 hover:text-red-500 text-xs ml-2"
                      >
                        删除
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
