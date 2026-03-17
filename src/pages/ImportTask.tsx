import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { createTask } from "../lib/api";
import { LANGUAGE_OPTIONS, type Language } from "../lib/types";
import { IconArrowLeft, IconUpload, IconCheck, IconLoader } from "../components/Icons";

interface ImportItem {
  title: string;
  language: Language;
  lines: string[];
}

function parseTxt(content: string): string[] {
  return content.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);
}

function parseCsv(content: string): ImportItem[] {
  const rows = content.split("\n").map((r) => r.trim()).filter((r) => r.length > 0);
  if (rows.length < 2) return [];

  const header = rows[0].toLowerCase();
  const hasHeader = header.includes("title") || header.includes("language") || header.includes("text");

  const dataRows = hasHeader ? rows.slice(1) : rows;
  const tasks = new Map<string, ImportItem>();

  for (const row of dataRows) {
    // Simple CSV split (handle quoted fields)
    const fields = splitCsvRow(row);
    if (fields.length < 1) continue;

    if (hasHeader) {
      // Structured CSV: title, language, text
      const title = fields[0] || "";
      const lang = (fields[1] || "chinese") as Language;
      const text = fields[2] || "";
      if (!text) continue;

      const key = `${title}|${lang}`;
      if (!tasks.has(key)) {
        tasks.set(key, { title, language: lang, lines: [] });
      }
      tasks.get(key)!.lines.push(text);
    } else {
      // Plain CSV: each row is one sentence
      const text = fields[0];
      if (!text) continue;
      const key = "__default__";
      if (!tasks.has(key)) {
        tasks.set(key, { title: "", language: "chinese", lines: [] });
      }
      tasks.get(key)!.lines.push(text);
    }
  }

  return Array.from(tasks.values());
}

function parseJson(content: string): ImportItem[] {
  const data = JSON.parse(content);
  const items: ImportItem[] = [];

  if (Array.isArray(data)) {
    for (const entry of data) {
      if (typeof entry === "string") {
        // Array of strings → single task
        if (items.length === 0) {
          items.push({ title: "", language: "chinese", lines: [] });
        }
        items[0].lines.push(entry);
      } else if (entry && typeof entry === "object") {
        // Array of task objects
        const lines: string[] = Array.isArray(entry.lines)
          ? entry.lines
          : Array.isArray(entry.texts)
            ? entry.texts
            : Array.isArray(entry.sentences)
              ? entry.sentences
              : typeof entry.text === "string"
                ? entry.text.split("\n").filter((l: string) => l.trim())
                : [];
        if (lines.length > 0) {
          items.push({
            title: entry.title || "",
            language: entry.language || "chinese",
            lines,
          });
        }
      }
    }
  } else if (data && typeof data === "object") {
    // Single task object
    const lines: string[] = Array.isArray(data.lines)
      ? data.lines
      : Array.isArray(data.texts)
        ? data.texts
        : Array.isArray(data.sentences)
          ? data.sentences
          : [];
    if (lines.length > 0) {
      items.push({
        title: data.title || "",
        language: data.language || "chinese",
        lines,
      });
    }
  }

  return items;
}

function splitCsvRow(row: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < row.length; i++) {
    const ch = row[i];
    if (ch === '"') {
      if (inQuotes && row[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      fields.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  fields.push(current.trim());
  return fields;
}

export default function ImportTask() {
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<ImportItem[]>([]);
  const [language, setLanguage] = useState<Language>("chinese");
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [importing, setImporting] = useState(false);
  const [imported, setImported] = useState(0);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setFileName(file.name);
    setImported(0);

    try {
      const content = await file.text();
      const ext = file.name.split(".").pop()?.toLowerCase();

      let items: ImportItem[];
      if (ext === "json" || ext === "jsonl") {
        if (ext === "jsonl") {
          const lines = content.split("\n").filter((l) => l.trim());
          const parsed = lines.map((l) => JSON.parse(l));
          items = parseJson(JSON.stringify(parsed));
        } else {
          items = parseJson(content);
        }
      } else if (ext === "csv") {
        items = parseCsv(content);
      } else {
        // Default: TXT
        const lines = parseTxt(content);
        items = lines.length > 0 ? [{ title: file.name.replace(/\.\w+$/, ""), language, lines }] : [];
      }

      if (items.length === 0) {
        setError("未找到有效数据");
        setPreview([]);
        return;
      }
      setPreview(items);
    } catch (err) {
      setError("文件解析失败: " + String(err));
      setPreview([]);
    }
  }

  async function handleImport() {
    if (preview.length === 0) return;
    setImporting(true);
    setError("");
    let count = 0;

    try {
      for (const item of preview) {
        const lang = item.language || language;
        await createTask(
          item.title,
          item.lines.join("\n"),
          lang
        );
        count++;
        setImported(count);
      }
      // Done, navigate to list
      navigate("/");
    } catch (err) {
      setError(`导入第 ${count + 1} 个任务时失败: ${err}`);
    } finally {
      setImporting(false);
    }
  }

  const totalSentences = preview.reduce((a, t) => a + t.lines.length, 0);

  return (
    <div className="max-w-3xl mx-auto px-8 py-8">
      <button
        onClick={() => navigate("/")}
        className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors cursor-pointer mb-6"
      >
        <IconArrowLeft className="w-4 h-4" />
        返回列表
      </button>

      <h1 className="text-2xl font-bold text-gray-900 tracking-tight mb-1">
        批量导入任务
      </h1>
      <p className="text-sm text-gray-500 mb-8">
        从文件导入跟读任务，支持 TXT / CSV / JSON / JSONL 格式
      </p>

      {/* Format guide */}
      <div className="bg-gray-50 border border-gray-100 rounded-2xl p-5 mb-6">
        <h2 className="text-sm font-semibold text-gray-800 mb-3">支持的导入格式</h2>
        <div className="space-y-4 text-sm text-gray-600">
          <div>
            <span className="inline-block px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-medium mr-2">TXT</span>
            每行一句话，整个文件创建为一个任务
            <pre className="mt-1.5 bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-700 font-mono overflow-x-auto">
{`你好世界
今天天气真好
我喜欢编程`}
            </pre>
          </div>
          <div>
            <span className="inline-block px-2 py-0.5 bg-green-50 text-green-700 rounded text-xs font-medium mr-2">CSV</span>
            含表头 title,language,text — 相同 title+language 合并为一个任务
            <pre className="mt-1.5 bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-700 font-mono overflow-x-auto">
{`title,language,text
日语练习,japanese,今日はいい天気ですね
日语练习,japanese,お元気ですか
英语口语,english,How are you doing today
英语口语,english,Nice to meet you`}
            </pre>
          </div>
          <div>
            <span className="inline-block px-2 py-0.5 bg-purple-50 text-purple-700 rounded text-xs font-medium mr-2">JSON</span>
            任务数组，每个任务含 title / language / lines
            <pre className="mt-1.5 bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-700 font-mono overflow-x-auto">
{`[
  {
    "title": "中文朗读",
    "language": "chinese",
    "lines": ["你好世界", "今天天气真好"]
  }
]`}
            </pre>
          </div>
          <div>
            <span className="inline-block px-2 py-0.5 bg-amber-50 text-amber-700 rounded text-xs font-medium mr-2">JSONL</span>
            每行一个 JSON 对象，格式同 JSON 中的单个任务
          </div>
          <p className="text-xs text-gray-400 mt-2">
            language 可选值：chinese / english / japanese / korean / cantonese
          </p>
        </div>
      </div>

      {/* File upload */}
      <div className="mb-6">
        <input
          ref={fileRef}
          type="file"
          accept=".txt,.csv,.json,.jsonl"
          onChange={handleFile}
          className="hidden"
        />
        <div className="flex items-center gap-4">
          <button
            onClick={() => fileRef.current?.click()}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-white border-2 border-dashed border-gray-300 text-gray-600 text-sm font-medium rounded-xl hover:border-primary-400 hover:text-primary-600 transition-colors cursor-pointer"
          >
            <IconUpload className="w-4 h-4" />
            选择文件
          </button>
          {fileName && (
            <span className="text-sm text-gray-500">{fileName}</span>
          )}
        </div>
      </div>

      {/* Default language for TXT */}
      {preview.length > 0 && preview.some((p) => !p.language || p.language === "chinese") && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            默认语种（TXT 导入时使用）
          </label>
          <div className="flex gap-2 flex-wrap">
            {LANGUAGE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  setLanguage(opt.value);
                  setPreview((prev) =>
                    prev.map((p) =>
                      !p.language || p.language === language
                        ? { ...p, language: opt.value }
                        : p
                    )
                  );
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  language === opt.value
                    ? "bg-primary-600 text-white"
                    : "bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 bg-red-50 text-red-700 px-4 py-3 rounded-xl text-sm mb-6 animate-slide-in">
          <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          {error}
        </div>
      )}

      {/* Preview */}
      {preview.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-gray-800 mb-3">
            预览（{preview.length} 个任务，{totalSentences} 句）
          </h2>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {preview.map((item, i) => {
              const langLabel = LANGUAGE_OPTIONS.find((o) => o.value === item.language)?.label ?? item.language;
              return (
                <div key={i} className="bg-white border border-gray-100 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-medium text-gray-800 text-sm">
                      {item.title || `任务 ${i + 1}`}
                    </span>
                    <span className="px-2 py-0.5 text-[11px] font-medium rounded-md bg-primary-50 text-primary-700">
                      {langLabel}
                    </span>
                    <span className="text-xs text-gray-400">{item.lines.length} 句</span>
                  </div>
                  <div className="text-xs text-gray-500 space-y-0.5 max-h-24 overflow-y-auto">
                    {item.lines.slice(0, 5).map((line, j) => (
                      <div key={j} className="truncate">
                        <span className="text-gray-300 mr-1">{j + 1}.</span>
                        {line}
                      </div>
                    ))}
                    {item.lines.length > 5 && (
                      <div className="text-gray-400">... 还有 {item.lines.length - 5} 句</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Import button */}
      {preview.length > 0 && (
        <button
          onClick={handleImport}
          disabled={importing}
          className="w-full py-3 bg-primary-600 text-white text-sm font-medium rounded-xl hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-sm shadow-primary-600/20"
        >
          {importing ? (
            <span className="inline-flex items-center gap-2">
              <IconLoader className="w-4 h-4" />
              导入中 ({imported}/{preview.length})...
            </span>
          ) : (
            <span className="inline-flex items-center gap-2">
              <IconCheck className="w-4 h-4" />
              确认导入 {preview.length} 个任务（{totalSentences} 句）
            </span>
          )}
        </button>
      )}
    </div>
  );
}
