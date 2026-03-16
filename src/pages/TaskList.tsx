import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { listTasks, deleteTask } from "../lib/api";
import type { Task } from "../lib/types";
import { LANGUAGE_OPTIONS } from "../lib/types";
import { IconPlus, IconTrash, IconClipboard } from "../components/Icons";

export default function TaskList() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadTasks();
  }, []);

  async function loadTasks() {
    const t = await listTasks();
    setTasks(t);
  }

  async function handleDelete(id: string) {
    if (deleteConfirm === id) {
      await deleteTask(id);
      setDeleteConfirm(null);
      loadTasks();
    } else {
      setDeleteConfirm(id);
    }
  }

  function langLabel(lang: string) {
    return LANGUAGE_OPTIONS.find((o) => o.value === lang)?.label ?? lang;
  }

  function completedCount(task: Task) {
    return task.items.filter((i) => i.attempts.length > 0).length;
  }

  return (
    <div className="max-w-4xl mx-auto px-8 py-8">
      {/* Header */}
      <div className="flex items-end justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            我的跟读任务
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {tasks.length > 0
              ? `共 ${tasks.length} 个任务`
              : "还没有任务，开始创建吧"}
          </p>
        </div>
        <button
          onClick={() => navigate("/create")}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white text-sm font-medium rounded-xl hover:bg-primary-700 active:bg-primary-800 transition-colors cursor-pointer shadow-sm shadow-primary-600/20"
        >
          <IconPlus className="w-4 h-4" />
          创建任务
        </button>
      </div>

      {/* Empty state */}
      {tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24">
          <div className="w-16 h-16 rounded-2xl bg-primary-50 flex items-center justify-center mb-5">
            <IconPlus className="w-7 h-7 text-primary-400" />
          </div>
          <p className="text-gray-900 font-medium">暂无跟读任务</p>
          <p className="text-sm text-gray-400 mt-1">
            点击上方按钮创建你的第一个跟读任务
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {tasks.map((task) => {
            const done = completedCount(task);
            const total = task.items.length;
            const pct = Math.round((done / total) * 100);
            return (
              <div
                key={task.id}
                onClick={() => navigate(`/task/${task.id}`)}
                className="group bg-surface-card border border-gray-100 rounded-2xl p-5 hover:shadow-lg hover:shadow-gray-200/50 hover:border-primary-100 transition-all duration-200 cursor-pointer"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5">
                      <h2 className="text-base font-semibold text-gray-900 truncate">
                        {task.title || "未命名任务"}
                      </h2>
                      <span className="shrink-0 px-2 py-0.5 text-[11px] font-medium rounded-md bg-primary-50 text-primary-700">
                        {langLabel(task.language)}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 mt-3">
                      {/* Progress bar */}
                      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            pct === 100
                              ? "bg-accent-500"
                              : "bg-primary-500"
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="shrink-0 text-xs tabular-nums text-gray-400">
                        {done}/{total}
                      </span>
                      {pct === 100 && (
                        <span className="shrink-0 text-[11px] font-medium text-accent-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                          已完成
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Results */}
                  {done > 0 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/task/${task.id}/results`);
                      }}
                      className="shrink-0 p-2 rounded-lg text-gray-300 hover:text-primary-600 hover:bg-primary-50 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                      title="查看结果"
                    >
                      <IconClipboard className="w-4 h-4" />
                    </button>
                  )}

                  {/* Delete */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(task.id);
                    }}
                    className={`shrink-0 p-2 rounded-lg transition-colors cursor-pointer ${
                      deleteConfirm === task.id
                        ? "bg-red-500 text-white"
                        : "text-gray-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100"
                    }`}
                    title={
                      deleteConfirm === task.id ? "再次点击确认删除" : "删除"
                    }
                  >
                    <IconTrash className="w-4 h-4" />
                  </button>
                </div>

                {deleteConfirm === task.id && (
                  <div className="mt-3 flex items-center gap-2 text-xs animate-slide-in">
                    <span className="text-red-600 font-medium">
                      确认删除此任务？
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteConfirm(null);
                      }}
                      className="text-gray-400 hover:text-gray-600 underline cursor-pointer"
                    >
                      取消
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
