import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { listTasks, deleteTask } from "../lib/api";
import type { Task } from "../lib/types";
import { LANGUAGE_OPTIONS } from "../lib/types";

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
    <div className="max-w-3xl mx-auto p-6">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-800">跟读任务</h1>
        <button
          onClick={() => navigate("/create")}
          className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm"
        >
          + 创建任务
        </button>
      </div>

      {tasks.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-lg">暂无任务</p>
          <p className="text-sm mt-2">点击上方按钮创建第一个跟读任务</p>
        </div>
      ) : (
        <div className="space-y-4">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => navigate(`/task/${task.id}`)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h2 className="text-lg font-semibold text-gray-800">
                    {task.title || "未命名任务"}
                  </h2>
                  <div className="flex items-center gap-3 mt-2 text-sm text-gray-500">
                    <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md text-xs font-medium">
                      {langLabel(task.language)}
                    </span>
                    <span>
                      {completedCount(task)} / {task.items.length} 句
                    </span>
                  </div>
                  <div className="mt-3 w-full bg-gray-100 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all"
                      style={{
                        width: `${(completedCount(task) / task.items.length) * 100}%`,
                      }}
                    />
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(task.id);
                  }}
                  className={`ml-4 px-3 py-1.5 text-sm rounded-lg transition-colors ${
                    deleteConfirm === task.id
                      ? "bg-red-600 text-white"
                      : "text-gray-400 hover:text-red-500 hover:bg-red-50"
                  }`}
                >
                  {deleteConfirm === task.id ? "确认删除" : "删除"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
