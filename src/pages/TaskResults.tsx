import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getTask, listTasks } from "../lib/api";
import type { Task } from "../lib/types";
import { LANGUAGE_OPTIONS } from "../lib/types";
import { IconArrowLeft, IconCheck, IconLoader } from "../components/Icons";

type ExportFormat = "csv" | "jsonl" | "json";

function buildExportRows(task: Task) {
  const rows: {
    original: string;
    recognized: string;
    attempt_index: number;
    language: string;
    timestamp: string;
  }[] = [];
  for (const item of task.items) {
    for (let i = 0; i < item.attempts.length; i++) {
      rows.push({
        original: item.original_text,
        recognized: item.attempts[i].text,
        attempt_index: i + 1,
        language: task.language,
        timestamp: item.attempts[i].timestamp,
      });
    }
  }
  return rows;
}

function buildMultiTaskExportRows(tasks: Task[]) {
  const rows: {
    task_title: string;
    original: string;
    recognized: string;
    attempt_index: number;
    language: string;
    timestamp: string;
  }[] = [];
  for (const task of tasks) {
    for (const item of task.items) {
      for (let i = 0; i < item.attempts.length; i++) {
        rows.push({
          task_title: task.title || "",
          original: item.original_text,
          recognized: item.attempts[i].text,
          attempt_index: i + 1,
          language: task.language,
          timestamp: item.attempts[i].timestamp,
        });
      }
    }
  }
  return rows;
}

function escapeCsv(s: string) {
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

function downloadFile(content: string, filename: string, mime: string) {
  const blob = new Blob(["\uFEFF" + content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function exportData(
  rows: { original: string; recognized: string; attempt_index: number; language: string; timestamp: string; task_title?: string }[],
  format: ExportFormat,
  filename: string
) {
  if (format === "csv") {
    const hasTaskTitle = rows.some((r) => "task_title" in r && r.task_title !== undefined);
    const headers = hasTaskTitle
      ? ["task_title", "original", "recognized", "attempt_index", "language", "timestamp"]
      : ["original", "recognized", "attempt_index", "language", "timestamp"];
    const lines = [
      headers.join(","),
      ...rows.map((r) =>
        headers.map((h) => escapeCsv(String((r as Record<string, unknown>)[h] ?? ""))).join(",")
      ),
    ];
    downloadFile(lines.join("\n"), `${filename}.csv`, "text/csv;charset=utf-8");
  } else if (format === "jsonl") {
    const lines = rows.map((r) => JSON.stringify(r));
    downloadFile(lines.join("\n"), `${filename}.jsonl`, "application/jsonl;charset=utf-8");
  } else {
    downloadFile(JSON.stringify(rows, null, 2), `${filename}.json`, "application/json;charset=utf-8");
  }
}

export default function TaskResults() {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const [task, setTask] = useState<Task | null>(null);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [error, setError] = useState("");
  const [showExportMenu, setShowExportMenu] = useState(false);

  const loadTask = useCallback(async () => {
    if (!taskId) return;
    try {
      setTask(await getTask(taskId));
    } catch (err) {
      setError(String(err));
    }
  }, [taskId]);

  useEffect(() => {
    loadTask();
    listTasks().then(setAllTasks).catch(() => {});
  }, [loadTask]);

  function handleExport(format: ExportFormat) {
    if (!task) return;
    const rows = buildExportRows(task);
    if (rows.length === 0) {
      setError("没有可导出的识别记录");
      return;
    }
    const name = task.title?.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, "_") || "task";
    exportData(rows, format, `${name}_${task.language}`);
    setShowExportMenu(false);
  }

  function handleExportAll(format: ExportFormat) {
    const rows = buildMultiTaskExportRows(allTasks);
    if (rows.length === 0) {
      setError("没有可导出的识别记录");
      return;
    }
    exportData(rows, format, `all_tasks_export`);
    setShowExportMenu(false);
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
  const totalAttempts = task.items.reduce((a, i) => a + i.attempts.length, 0);
  const langLabel =
    LANGUAGE_OPTIONS.find((o) => o.value === task.language)?.label ??
    task.language;

  return (
    <div className="max-w-4xl mx-auto px-8 py-8">
      {/* Back */}
      <button
        onClick={() => navigate(`/task/${task.id}`)}
        className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors cursor-pointer mb-6"
      >
        <IconArrowLeft className="w-4 h-4" />
        返回练习
      </button>

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            结果总览
          </h1>
          <div className="flex items-center gap-3 mt-2 text-sm text-gray-500">
            <span className="font-medium text-gray-700">
              {task.title || "未命名任务"}
            </span>
            <span className="px-2 py-0.5 text-[11px] font-medium rounded-md bg-primary-50 text-primary-700">
              {langLabel}
            </span>
            <span>
              {completed}/{task.items.length} 句已完成 ({totalAttempts} 条记录)
            </span>
          </div>
        </div>

        {/* Export buttons */}
        <div className="relative">
          <button
            onClick={() => setShowExportMenu(!showExportMenu)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white text-sm font-medium rounded-xl hover:bg-primary-700 transition-colors cursor-pointer shadow-sm shadow-primary-600/20"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" x2="12" y1="15" y2="3" />
            </svg>
            导出数据
          </button>

          {showExportMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowExportMenu(false)}
              />
              <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-gray-200 rounded-xl shadow-lg z-20 py-1 animate-slide-in">
                <div className="px-3 py-2 text-[11px] text-gray-400 uppercase tracking-wider">
                  当前任务
                </div>
                <button
                  onClick={() => handleExport("csv")}
                  className="w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left cursor-pointer flex items-center justify-between"
                >
                  <span>导出 CSV</span>
                  <span className="text-[11px] text-gray-400">Excel 兼容</span>
                </button>
                <button
                  onClick={() => handleExport("jsonl")}
                  className="w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left cursor-pointer flex items-center justify-between"
                >
                  <span>导出 JSONL</span>
                  <span className="text-[11px] text-gray-400">训练数据</span>
                </button>
                <button
                  onClick={() => handleExport("json")}
                  className="w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left cursor-pointer flex items-center justify-between"
                >
                  <span>导出 JSON</span>
                  <span className="text-[11px] text-gray-400">结构化</span>
                </button>

                <div className="mx-3 my-1 h-px bg-gray-100" />

                <div className="px-3 py-2 text-[11px] text-gray-400 uppercase tracking-wider">
                  所有任务
                </div>
                <button
                  onClick={() => handleExportAll("csv")}
                  className="w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left cursor-pointer"
                >
                  导出全部 CSV
                </button>
                <button
                  onClick={() => handleExportAll("jsonl")}
                  className="w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left cursor-pointer"
                >
                  导出全部 JSONL
                </button>
                <button
                  onClick={() => handleExportAll("json")}
                  className="w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left cursor-pointer"
                >
                  导出全部 JSON
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 px-4 py-2.5 rounded-xl text-sm mb-4">
          {error}
        </div>
      )}

      {/* Results table */}
      <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
        {/* Table header */}
        <div className="grid grid-cols-[48px_1fr_1fr_1fr] gap-0 border-b border-gray-100 bg-gray-50/80 text-xs font-medium text-gray-500 uppercase tracking-wider">
          <div className="px-4 py-3 text-center">#</div>
          <div className="px-4 py-3">原文</div>
          <div className="px-4 py-3">第 1 次识别</div>
          <div className="px-4 py-3">第 2 次识别</div>
        </div>

        {/* Rows */}
        {task.items.map((item, index) => {
          const a1 = item.attempts[0];
          const a2 = item.attempts[1];
          const done = item.attempts.length > 0;

          return (
            <div
              key={index}
              className={`grid grid-cols-[48px_1fr_1fr_1fr] gap-0 border-b border-gray-50 last:border-b-0 transition-colors ${
                done ? "bg-white" : "bg-gray-50/30"
              }`}
            >
              <div className="px-4 py-4 flex items-start justify-center">
                {done ? (
                  <span className="w-6 h-6 rounded-full bg-accent-500 flex items-center justify-center">
                    <IconCheck className="w-3.5 h-3.5 text-white" />
                  </span>
                ) : (
                  <span className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs text-gray-500 font-medium">
                    {index + 1}
                  </span>
                )}
              </div>

              <div className="px-4 py-4">
                <p className="text-[14px] text-gray-900 leading-relaxed">
                  {item.original_text}
                </p>
              </div>

              <div className="px-4 py-4">
                {a1 ? (
                  <div>
                    <p className="text-[14px] text-gray-700 leading-relaxed">
                      {a1.text}
                    </p>
                    <p className="text-[11px] text-gray-400 mt-1">
                      {new Date(a1.timestamp).toLocaleString()}
                    </p>
                  </div>
                ) : (
                  <span className="text-sm text-gray-300">--</span>
                )}
              </div>

              <div className="px-4 py-4">
                {a2 ? (
                  <div>
                    <p className="text-[14px] text-gray-700 leading-relaxed">
                      {a2.text}
                    </p>
                    <p className="text-[11px] text-gray-400 mt-1">
                      {new Date(a2.timestamp).toLocaleString()}
                    </p>
                  </div>
                ) : (
                  <span className="text-sm text-gray-300">--</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div className="mt-6 flex items-center justify-between text-sm text-gray-500">
        <span>
          共 {task.items.length} 句，已完成 {completed} 句，{totalAttempts} 条识别记录
        </span>
        <button
          onClick={() => navigate(`/task/${task.id}`)}
          className="text-primary-600 hover:text-primary-700 font-medium cursor-pointer"
        >
          继续练习
        </button>
      </div>
    </div>
  );
}
