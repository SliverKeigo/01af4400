import { useNavigate, useLocation } from "react-router-dom";
import { IconList, IconPlus, IconVolume } from "./Icons";

const NAV_ITEMS = [
  { path: "/", label: "任务列表", icon: IconList },
  { path: "/create", label: "创建任务", icon: IconPlus },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <aside className="w-60 bg-surface-sidebar text-white flex flex-col shrink-0 h-screen sticky top-0">
      {/* Logo */}
      <div className="px-5 py-6 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-primary-500 flex items-center justify-center">
          <IconVolume className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="font-bold text-base tracking-tight">跟读助手</h1>
          <p className="text-[11px] text-indigo-300/70 mt-0.5">SenseVoice ASR</p>
        </div>
      </div>

      {/* Divider */}
      <div className="mx-4 h-px bg-indigo-700/40" />

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
                  ? "bg-surface-sidebar-active text-white"
                  : "text-indigo-200/80 hover:bg-surface-sidebar-hover hover:text-white"
              }`}
            >
              <Icon className="w-[18px] h-[18px]" />
              {label}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 text-[11px] text-indigo-400/50">
        Tauri + React + sherpa-onnx
      </div>
    </aside>
  );
}
