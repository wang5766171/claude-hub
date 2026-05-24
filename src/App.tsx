import { useState } from "react";
import "@/i18n";
import { ChatPage } from "@/pages/chat-page";
import { ManagePage } from "@/pages/manage-page";
import { useInvoke } from "@/hooks/use-invoke";
import { useTranslation } from "react-i18next";
import { Pin, PinOff, Settings, Sun, Palette, Moon } from "lucide-react";
import logo from "@/assets/logo.png";
import { invokeCommand } from "@/hooks/use-invoke";
import { getVersion } from "@tauri-apps/api/app";
import { useEffect, useState as useReactState } from "react";
import { cn } from "@/lib/utils";
import { useTheme, type Theme } from "@/hooks/use-theme";
import type { Page, Project } from "@/types";

const themeConfig: Record<Theme, { icon: typeof Sun; label: string }> = {
  light: { icon: Sun, label: "浅色" },
  colorful: { icon: Palette, label: "色彩" },
  dark: { icon: Moon, label: "暗色" },
};
const themeOrder: Theme[] = ["light", "colorful", "dark"];

function TitleBar({ currentPage, onNavigate }: { currentPage: Page; onNavigate: (page: Page) => void }) {
  const { t } = useTranslation();
  const [pinned, setPinned] = useReactState(false);
  const [version, setVersion] = useReactState("");
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    invokeCommand<boolean>("load_always_on_top").then(setPinned).catch(console.error);
    getVersion().then((v) => setVersion(v)).catch(() => setVersion(""));
  }, []);

  const handleToggle = async () => {
    try {
      const newValue = await invokeCommand<boolean>("toggle_always_on_top");
      setPinned(newValue);
    } catch (e) {
      console.error(e);
    }
  };

  const cycleTheme = () => {
    const idx = themeOrder.indexOf(theme);
    setTheme(themeOrder[(idx + 1) % themeOrder.length]);
  };

  const { icon: ThemeIcon, label: themeLabel } = themeConfig[theme];

  return (
    <div className="flex items-center h-10 border-b border-border/30 px-4" data-tauri-drag-region style={{ background: "var(--color-layer-0)" }}>
      <div className="flex items-center gap-2 flex-1" data-tauri-drag-region>
        <img src={logo} alt="Jishu Hub" className="h-5 w-5 rounded" />
        <span className="text-sm font-semibold" data-tauri-drag-region>Jishu Hub</span>
        {version && <span className="text-[10px] text-muted-foreground/50 font-mono">v{version}</span>}
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onNavigate(currentPage === "chat" ? "manage" : "chat")}
          className={cn(
            "h-7 px-3 rounded-lg flex items-center gap-1.5 text-xs transition-fast",
            currentPage === "manage"
              ? "bg-accent/80 text-accent-foreground font-medium"
              : "text-muted-foreground hover:bg-accent/30 hover:text-foreground"
          )}
        >
          <Settings className="h-3.5 w-3.5 text-[var(--icon-action)]" />
          <span>{currentPage === "manage" ? t("sessions.title") : t("nav.config")}</span>
        </button>
        <button
          onClick={cycleTheme}
          className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-accent/30 transition-fast text-muted-foreground hover:text-foreground"
          title={themeLabel}
        >
          <ThemeIcon className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={handleToggle}
          className={cn(
            "h-7 w-7 flex items-center justify-center rounded-lg hover:bg-accent/30 transition-fast",
            pinned && "text-primary"
          )}
          title={pinned ? "取消置顶" : "置顶窗口"}
        >
          {pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
        </button>
      </div>
    </div>
  );
}

function App() {
  useTranslation();
  const [currentPage, setCurrentPage] = useState<Page>("chat");
  const { data: projects } = useInvoke<Project[]>("scan_projects");

  const navigateToSession = (_encodedName: string) => {
    setCurrentPage("chat");
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      <TitleBar currentPage={currentPage} onNavigate={setCurrentPage} />
      <div className="flex-1 overflow-hidden">
        <div className={cn("h-full", currentPage !== "chat" && "hidden")}><ChatPage onOpenManage={() => setCurrentPage("manage")} /></div>
        <div className={cn("h-full", currentPage !== "manage" && "hidden")}><ManagePage onBack={() => setCurrentPage("chat")} onViewSessions={navigateToSession} /></div>
      </div>
      <div className="h-6 flex items-center px-4 text-[10px] text-muted-foreground/50 border-t border-border/30" data-tauri-drag-region>
        <span>{projects?.length ?? 0} projects</span>
      </div>
    </div>
  );
}

export default App;
