import "@/i18n";
import { ChatPage } from "@/pages/chat-page";
import { ManagePage } from "@/pages/manage-page";
import { useInvoke, invokeCommand } from "@/hooks/use-invoke";
import { useTranslation } from "react-i18next";
import { Pin, PinOff, Settings, Sun, Palette, Moon } from "lucide-react";
import logo from "@/assets/logo.png";
import { getVersion } from "@tauri-apps/api/app";
import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { useTheme, type Theme } from "@/hooks/use-theme";
import type { Page, Project } from "@/types";

const themeConfig: Record<Theme, { icon: typeof Sun; label: string }> = {
  light: { icon: Sun, label: "浅色" },
  colorful: { icon: Palette, label: "色彩" },
  dark: { icon: Moon, label: "暗色" },
};
const themeOrder: Theme[] = ["light", "colorful", "dark"];

function LoadingOverlay() {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="relative h-14 w-14">
        <div className="absolute inset-0 rounded-full border-2 border-muted-foreground/20" />
        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary animate-spin" />
        <img src={logo} alt="" className="absolute inset-2 h-10 w-10 rounded-lg" />
      </div>
    </div>
  );
}

function TitleBar({ currentPage, onNavigate, disabled }: { currentPage: Page; onNavigate: (page: Page) => void; disabled?: boolean }) {
  const { t } = useTranslation();
  const [pinned, setPinned] = useState(false);
  const [version, setVersion] = useState("");
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
          onClick={disabled ? undefined : () => onNavigate(currentPage === "chat" ? "manage" : "chat")}
          className={cn(
            "h-7 px-3 rounded-lg flex items-center gap-1.5 text-xs transition-fast",
            disabled && "pointer-events-none opacity-50",
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
  const [refreshing, setRefreshing] = useState(false);
  const { data: projects, loading: projectsLoading, refetch: refetchProjects } = useInvoke<Project[]>("scan_projects");
  const { data: sessionNames, loading: namesLoading, refetch: refetchNames } = useInvoke<Record<string, string>>("get_session_names");

  // Startup: hooks start with loading=true (initial state, not a transition — reliable)
  // Refresh: refreshing flag set in event handler, cleared after awaiting actual Promises
  const loading = projectsLoading || namesLoading || refreshing;

  // Refresh handler: directly await refetch Promises in the event handler
  // (not via useEffect watching loading states — that's an anti-pattern broken by React batching)
  const handleRefresh = useCallback(async (): Promise<number> => {
    setRefreshing(true);
    try {
      await Promise.all([refetchProjects(), refetchNames()]);
      return Date.now();
    } finally {
      setRefreshing(false);
    }
  }, [refetchProjects, refetchNames]);

  const navigateToSession = (_encodedName: string) => {
    setCurrentPage("chat");
  };

  return (
    <div className="flex flex-col h-screen bg-background relative">
      <TitleBar currentPage={currentPage} onNavigate={setCurrentPage} disabled={loading} />
      <div className="flex-1 overflow-hidden">
        <div className={cn("h-full", currentPage !== "chat" && "hidden")}><ChatPage onOpenManage={() => setCurrentPage("manage")} onRefresh={handleRefresh} projects={projects} sessionNames={sessionNames} refetchNames={refetchNames} /></div>
        <div className={cn("h-full", currentPage !== "manage" && "hidden")}><ManagePage onBack={() => setCurrentPage("chat")} onViewSessions={navigateToSession} /></div>
      </div>
      <div className="h-6 flex items-center px-4 text-[10px] text-muted-foreground/50 border-t border-border/30" data-tauri-drag-region>
        <span>{projects?.length ?? 0} projects</span>
      </div>
      {loading && <LoadingOverlay />}
    </div>
  );
}

export default App;
