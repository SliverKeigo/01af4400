import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createTask } from "../lib/api";
import { LANGUAGE_OPTIONS, type Language } from "../lib/types";

export default function CreateTask() {
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [language, setLanguage] = useState<Language>("chinese");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const lineCount = text
    .split("\n")
    .filter((l) => l.trim().length > 0).length;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) {
      setError("请输入跟读文本");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const task = await createTask(title, text, language);
      navigate(`/task/${task.id}`);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <button
        onClick={() => navigate("/")}
        className="text-gray-500 hover:text-gray-700 mb-6 inline-flex items-center gap-1 text-sm"
      >
        ← 返回列表
      </button>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">创建跟读任务</h1>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            标题（可选）
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="为任务取个名字..."
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            语种
          </label>
          <div className="flex gap-2 flex-wrap">
            {LANGUAGE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setLanguage(opt.value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  language === opt.value
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            跟读文本（每行一句）
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={10}
            placeholder="在此输入文本，每行为一句跟读内容..."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors resize-y font-mono text-sm"
          />
          {lineCount > 0 && (
            <p className="text-xs text-gray-400 mt-1">
              共 {lineCount} 句
            </p>
          )}
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 px-4 py-2.5 rounded-lg text-sm">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium shadow-sm"
        >
          {loading ? "创建中..." : "创建任务"}
        </button>
      </form>
    </div>
  );
}
