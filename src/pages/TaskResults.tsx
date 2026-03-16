import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getTask } from "../lib/api";
import type { Task } from "../lib/types";
import { LANGUAGE_OPTIONS } from "../lib/types";
import { IconArrowLeft, IconCheck, IconLoader } from "../components/Icons";

export default function TaskResults() {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const [task, setTask] = useState<Task | null>(null);
  const [error, setError] = useState("");

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
  }, [loadTask]);

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
      <div className="mb-8">
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
            {completed}/{task.items.length} 句已完成
          </span>
        </div>
      </div>

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
              {/* Index */}
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

              {/* Original text */}
              <div className="px-4 py-4">
                <p className="text-[14px] text-gray-900 leading-relaxed">
                  {item.original_text}
                </p>
              </div>

              {/* Attempt 1 */}
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

              {/* Attempt 2 */}
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
          共 {task.items.length} 句，已完成 {completed} 句
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
