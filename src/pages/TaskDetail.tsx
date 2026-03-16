import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  getTask,
  saveAttempt,
  deleteAttempt,
  recognizeAudio,
  getModelStatus,
} from "../lib/api";
import type { Task } from "../lib/types";
import { LANGUAGE_OPTIONS } from "../lib/types";
import { useRecorder } from "../lib/useRecorder";
import {
  IconArrowLeft,
  IconMic,
  IconStop,
  IconCheck,
  IconX,
  IconTrash,
  IconLoader,
  IconSave,
  IconRefresh,
  IconClipboard,
} from "../components/Icons";

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
    getModelStatus()
      .then(setModelLoaded)
      .catch(() => setModelLoaded(false));
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
      const text = await recognizeAudio(
        samplesBase64,
        sampleRate,
        task.language
      );
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

  async function handleDeleteAttempt(
    itemIndex: number,
    attemptIndex: number
  ) {
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
      <div className="flex items-center justify-center h-full text-gray-400">
        {error ? (
          <span className="text-red-500">{error}</span>
        ) : (
          <IconLoader className="w-6 h-6 text-primary-400" />
        )}
      </div>
    );
  }

  const completed = task.items.filter((i) => i.attempts.length > 0).length;
  const pct = Math.round((completed / task.items.length) * 100);
  const langLabel =
    LANGUAGE_OPTIONS.find((o) => o.value === task.language)?.label ??
    task.language;

  return (
    <div className="max-w-3xl mx-auto px-8 py-8">
      {/* Back */}
      <button
        onClick={() => navigate("/")}
        className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors cursor-pointer mb-6"
      >
        <IconArrowLeft className="w-4 h-4" />
        返回列表
      </button>

      {/* Task header card */}
      <div className="bg-surface-card border border-gray-100 rounded-2xl p-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">
              {task.title || "未命名任务"}
            </h1>
            <div className="flex items-center gap-3 mt-2">
              <span className="px-2.5 py-0.5 text-[11px] font-medium rounded-md bg-primary-50 text-primary-700">
                {langLabel}
              </span>
              <span className="text-sm text-gray-500">
                {completed}/{task.items.length} 句完成
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(`/task/${task.id}/results`)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-600 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
            >
              <IconClipboard className="w-4 h-4" />
              查看结果
            </button>
            <span
              className={`text-2xl font-bold tabular-nums ${
                pct === 100 ? "text-accent-600" : "text-primary-600"
              }`}
            >
              {pct}%
            </span>
          </div>
        </div>
        {/* Progress bar */}
        <div className="mt-4 h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              pct === 100 ? "bg-accent-500" : "bg-primary-500"
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Model warning */}
      {modelLoaded === false && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200/60 text-amber-800 px-4 py-3 rounded-xl text-sm mb-6 animate-slide-in">
          <svg
            className="w-5 h-5 shrink-0 text-amber-500"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          <span>
            语音识别模型未加载。请将模型放置在项目根目录后重启应用。
          </span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center justify-between bg-red-50 border border-red-200/60 text-red-700 px-4 py-3 rounded-xl text-sm mb-6 animate-slide-in">
          <span>{error}</span>
          <button
            onClick={() => setError("")}
            className="text-red-400 hover:text-red-600 cursor-pointer p-1"
          >
            <IconX className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Items list */}
      <div className="space-y-3">
        {task.items.map((item, index) => {
          const isActive = activeItem === index;
          const hasMaxAttempts = item.attempts.length >= 2;
          const isDone = item.attempts.length > 0;

          return (
            <div
              key={index}
              className={`rounded-2xl border transition-all duration-200 animate-slide-in ${
                isActive
                  ? "border-primary-300 bg-primary-50/40 shadow-sm shadow-primary-100"
                  : isDone
                    ? "border-emerald-100 bg-emerald-50/20"
                    : "border-gray-100 bg-surface-card hover:border-gray-200"
              }`}
            >
              <div className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    {/* Index badge */}
                    <span
                      className={`shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold mt-0.5 ${
                        isDone
                          ? "bg-accent-500 text-white"
                          : "bg-gray-100 text-gray-400"
                      }`}
                    >
                      {isDone ? (
                        <IconCheck className="w-3.5 h-3.5" />
                      ) : (
                        index + 1
                      )}
                    </span>
                    <p className="text-gray-900 text-[15px] leading-relaxed pt-0.5">
                      {item.original_text}
                    </p>
                  </div>

                  {/* Action button */}
                  {!isActive && (
                    <div className="shrink-0">
                      {hasMaxAttempts ? (
                        <span className="text-[11px] text-amber-600 bg-amber-50 px-2.5 py-1.5 rounded-lg font-medium">
                          已达上限
                        </span>
                      ) : (
                        <button
                          onClick={() => handleStartRecording(index)}
                          disabled={activeItem !== null}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-primary-600 text-white text-xs font-medium rounded-xl hover:bg-primary-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                        >
                          <IconMic className="w-3.5 h-3.5" />
                          录音
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Recording / Recognition / Preview controls */}
                {isActive && (
                  <div className="mt-4 p-4 bg-white rounded-xl border border-primary-200/60 animate-slide-in">
                    {itemState === "recording" && (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="relative flex h-3 w-3">
                            <span className="animate-recording absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
                          </span>
                          <span className="text-sm font-medium text-red-600">
                            录音中...
                          </span>
                        </div>
                        <button
                          onClick={handleStopRecording}
                          className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-500 text-white text-sm font-medium rounded-xl hover:bg-red-600 transition-colors cursor-pointer"
                        >
                          <IconStop className="w-4 h-4" />
                          停止
                        </button>
                      </div>
                    )}
                    {itemState === "recognizing" && (
                      <div className="flex items-center gap-3 py-2">
                        <IconLoader className="w-5 h-5 text-primary-500" />
                        <span className="text-sm font-medium text-primary-700">
                          识别中，请稍候...
                        </span>
                      </div>
                    )}
                    {itemState === "preview" && (
                      <div>
                        <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wider">
                          识别结果
                        </p>
                        <div className="bg-gray-50 rounded-lg px-4 py-3 text-gray-900 text-[15px] leading-relaxed mb-4">
                          {previewText || (
                            <span className="text-gray-400 italic">
                              未识别到内容
                            </span>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={handleSave}
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-accent-600 text-white text-sm font-medium rounded-xl hover:bg-accent-500 transition-colors cursor-pointer"
                          >
                            <IconSave className="w-4 h-4" />
                            保存
                          </button>
                          <button
                            onClick={handleDiscard}
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-gray-100 text-gray-600 text-sm font-medium rounded-xl hover:bg-gray-200 transition-colors cursor-pointer"
                          >
                            <IconRefresh className="w-4 h-4" />
                            丢弃重录
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Existing attempts */}
                {item.attempts.length > 0 && !isActive && (
                  <div className="mt-3 ml-10 space-y-1.5">
                    {item.attempts.map((attempt, ai) => (
                      <div
                        key={ai}
                        className="group/attempt flex items-center justify-between bg-gray-50/80 rounded-lg px-3 py-2"
                      >
                        <div className="flex-1 min-w-0">
                          <span className="text-sm text-gray-700 truncate block">
                            {attempt.text}
                          </span>
                          <span className="text-[11px] text-gray-400">
                            {new Date(attempt.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <button
                          onClick={() => handleDeleteAttempt(index, ai)}
                          className="shrink-0 p-1.5 text-gray-300 hover:text-red-500 opacity-0 group-hover/attempt:opacity-100 transition-all cursor-pointer"
                          title="删除此记录"
                        >
                          <IconTrash className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
