import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createTask } from "../lib/api";
import { LANGUAGE_OPTIONS, type Language } from "../lib/types";
import { IconArrowLeft, IconLoader } from "../components/Icons";

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
    <div className="max-w-2xl mx-auto px-8 py-8">
      {/* Back */}
      <button
        onClick={() => navigate("/")}
        className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors cursor-pointer mb-6"
      >
        <IconArrowLeft className="w-4 h-4" />
        返回列表
      </button>

      <h1 className="text-2xl font-bold text-gray-900 tracking-tight mb-1">
        创建跟读任务
      </h1>
      <p className="text-sm text-gray-500 mb-8">
        输入要练习的文本，每行一句
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Title */}
        <div>
          <label
            htmlFor="title"
            className="block text-sm font-medium text-gray-700 mb-1.5"
          >
            任务标题
            <span className="text-gray-400 font-normal ml-1">（可选）</span>
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="例如：日语 N3 听力练习"
            className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 transition-shadow"
          />
        </div>

        {/* Language */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            选择语种
          </label>
          <div className="flex gap-2 flex-wrap">
            {LANGUAGE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setLanguage(opt.value)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-150 cursor-pointer ${
                  language === opt.value
                    ? "bg-primary-600 text-white shadow-sm shadow-primary-600/25 scale-[1.02]"
                    : "bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Text */}
        <div>
          <div className="flex items-baseline justify-between mb-1.5">
            <label
              htmlFor="text"
              className="text-sm font-medium text-gray-700"
            >
              跟读文本
            </label>
            {lineCount > 0 && (
              <span className="text-xs tabular-nums text-gray-400">
                {lineCount} 句
              </span>
            )}
          </div>
          <textarea
            id="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={12}
            placeholder={"在此输入文本，每行为一句跟读内容\n\n例如：\n你好，很高兴认识你\n今天天气真不错\n我想去图书馆看书"}
            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 transition-shadow resize-y"
          />
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 bg-red-50 text-red-700 px-4 py-3 rounded-xl text-sm animate-slide-in">
            <svg
              className="w-4 h-4 shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            {error}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-primary-600 text-white text-sm font-medium rounded-xl hover:bg-primary-700 active:bg-primary-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-sm shadow-primary-600/20"
        >
          {loading ? (
            <span className="inline-flex items-center gap-2">
              <IconLoader className="w-4 h-4" />
              创建中...
            </span>
          ) : (
            "创建任务"
          )}
        </button>
      </form>
    </div>
  );
}
