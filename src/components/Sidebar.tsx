import { useNavigate, useLocation } from "react-router-dom";
import { IconList, IconPlus } from "./Icons";

const NAV_ITEMS = [
  { path: "/", label: "任务列表", icon: IconList },
  { path: "/create", label: "创建任务", icon: IconPlus },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <aside className="w-60 bg-white border-r border-gray-200 flex flex-col shrink-0 h-screen sticky top-0">
      {/* Logo */}
      <div className="px-5 py-6 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl overflow-hidden shrink-0">
          <svg viewBox="0 0 512 512" className="w-full h-full">
            <defs>
              <linearGradient id="logo-bg" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style={{ stopColor: "#6366f1" }} />
                <stop offset="100%" style={{ stopColor: "#4338ca" }} />
              </linearGradient>
            </defs>
            <rect width="512" height="512" rx="108" fill="url(#logo-bg)" />
            <rect x="216" y="100" width="80" height="160" rx="40" fill="white" />
            <path d="M168 240 a88 88 0 0 0 176 0" fill="none" stroke="white" strokeWidth="24" strokeLinecap="round" />
            <line x1="256" y1="328" x2="256" y2="380" stroke="white" strokeWidth="24" strokeLinecap="round" />
            <path d="M120 180 a60 80 0 0 0 0 120" fill="none" stroke="white" strokeWidth="18" strokeLinecap="round" opacity="0.5" />
            <path d="M80 160 a90 110 0 0 0 0 160" fill="none" stroke="white" strokeWidth="18" strokeLinecap="round" opacity="0.3" />
            <path d="M392 180 a60 80 0 0 1 0 120" fill="none" stroke="white" strokeWidth="18" strokeLinecap="round" opacity="0.5" />
            <path d="M432 160 a90 110 0 0 1 0 160" fill="none" stroke="white" strokeWidth="18" strokeLinecap="round" opacity="0.3" />
            <line x1="186" y1="420" x2="326" y2="420" stroke="white" strokeWidth="16" strokeLinecap="round" opacity="0.6" />
            <line x1="210" y1="450" x2="302" y2="450" stroke="white" strokeWidth="12" strokeLinecap="round" opacity="0.35" />
          </svg>
        </div>
        <div>
          <h1 className="font-bold text-base tracking-tight text-gray-900">跟读助手</h1>
          <p className="text-[11px] text-gray-400 mt-0.5">SenseVoice ASR</p>
        </div>
      </div>

      {/* Divider */}
      <div className="mx-4 h-px bg-gray-100" />

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map(({ path, label, icon: Icon }) => {
          const isActive =
            path === "/"
              ? location.pathname === "/"
              : location.pathname.startsWith(path);
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                isActive
                  ? "bg-primary-50 text-primary-700"
                  : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <Icon className="w-[18px] h-[18px]" />
              {label}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 text-[11px] text-gray-300">
        Tauri + React + sherpa-onnx
      </div>
    </aside>
  );
}
