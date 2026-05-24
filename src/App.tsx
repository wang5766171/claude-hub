
import "@/i18n";
import { ChatPage } from "@/pages/chat-page";
import { ManagePage } from "@/pages/manage-page";
import { useInvoke, invokeCommand } from "@/hooks/use-invoke";
import { useTranslation } from "react-i18next";
import { Pin, PinOff, Settings, Sun, Palette, Moon, Info, Type } from "lucide-react";
import logo from "@/assets/logo.png";
import { Github } from "@/components/icons/github";
import { Gitee } from "@/components/icons/gitee";
import { getVersion } from "@tauri-apps/api/app";
import { useState, useEffect, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";
import { useTheme, type Theme } from "@/hooks/use-theme";
import { useFontSize, type FontLevel } from "@/hooks/use-font-size";
import type { Page, Project } from "@/types";

const themeConfig: Record<Theme, { icon: typeof Sun; label: string }> = {
  light: { icon: Sun, label: "浅色" },
  colorful: { icon: Palette, label: "色彩" },
  dark: { icon: Moon, label: "暗色" },
};
const themeOrder: Theme[] = ["light", "colorful", "dark"];

const fontLevels: { id: FontLevel; labelKey: string }[] = [
  { id: "s", labelKey: "fontSize.small" },
  { id: "m", labelKey: "fontSize.medium" },
  { id: "l", labelKey: "fontSize.large" },
  { id: "xl", labelKey: "fontSize.xlarge" },
];

function FontSizeRow({ label, value, onChange, t }: { label: string; value: FontLevel; onChange: (v: FontLevel) => void; t: (k: string) => string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] text-muted-foreground w-14 shrink-0">{label}</span>
      <div className="flex gap-1">
        {fontLevels.map(({ id, labelKey }) => (
          <button
            key={id}
            onClick={() => onChange(id)}
            className={cn(
              "px-2 py-0.5 rounded text-[11px] transition-fast",
              value === id
                ? "bg-primary text-primary-foreground font-medium"
                : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
            )}
          >
            {t(labelKey)}
          </button>
        ))}
      </div>
    </div>
  );
}

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
  const [aboutOpen, setAboutOpen] = useState(false);
  const [aboutHovered, setAboutHovered] = useState(false);
  const [fontOpen, setFontOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const { fontSizeBase, fontSizeProse, setFontSizeBase, setFontSizeProse } = useFontSize();
  const aboutRef = useRef<HTMLDivElement>(null);
  const fontRef = useRef<HTMLDivElement>(null);
  const aboutTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    invokeCommand<boolean>("load_always_on_top").then(setPinned).catch(console.error);
    getVersion().then((v) => setVersion(v)).catch(() => setVersion(""));
  }, []);

  useEffect(() => {
    if (!aboutOpen && !fontOpen) return;
    const handler = (e: MouseEvent) => {
      if (aboutOpen && aboutRef.current && !aboutRef.current.contains(e.target as Node)) {
        setAboutOpen(false);
      }
      if (fontOpen && fontRef.current && !fontRef.current.contains(e.target as Node)) {
        setFontOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [aboutOpen, fontOpen]);

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

  const scheduleAboutClose = () => {
    aboutTimerRef.current = setTimeout(() => {
      if (!aboutHovered) setAboutOpen(false);
    }, 150);
  };
  const cancelAboutClose = () => {
    if (aboutTimerRef.current) clearTimeout(aboutTimerRef.current);
    setAboutHovered(true);
  };

  const { icon: ThemeIcon, label: themeLabel } = themeConfig[theme];

  return (
    <div className="flex items-center h-10 border-b border-border/30 px-3" data-tauri-drag-region style={{ background: "var(--color-layer-0)" }}>
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
          <Settings className="h-3.5 w-3.5 text-[var(--icon-config)]" />
          <span>{currentPage === "manage" ? t("sessions.title") : t("nav.config")}</span>
        </button>
        <button
          onClick={cycleTheme}
          className="h-7 px-3 rounded-lg flex items-center gap-1.5 text-xs transition-fast text-muted-foreground hover:bg-accent/30 hover:text-foreground"
          title={themeLabel}
        >
          <ThemeIcon className="h-3.5 w-3.5 text-[var(--icon-theme)]" />
          <span>{themeLabel}</span>
        </button>
        <div className="relative" ref={fontRef}>
          <button
            onClick={() => setFontOpen(!fontOpen)}
            className={cn(
              "h-7 px-3 rounded-lg flex items-center gap-1.5 text-xs transition-fast text-muted-foreground hover:bg-accent/30 hover:text-foreground",
              fontOpen && "bg-accent/30 text-foreground"
            )}
            title={t("fontSize.title")}
          >
            <Type className="h-3.5 w-3.5 text-[var(--icon-theme)]" />
            <span>{t("fontSize.title")}</span>
          </button>
          {fontOpen && (
            <div className="absolute left-0 top-full mt-1 w-64 rounded-lg border border-border bg-card shadow-lg z-50 p-3 space-y-2">
              <FontSizeRow label={t("fontSize.ui")} value={fontSizeBase} onChange={setFontSizeBase} t={t} />
              <FontSizeRow label={t("fontSize.prose")} value={fontSizeProse} onChange={setFontSizeProse} t={t} />
            </div>
          )}
        </div>
        <div className="relative" ref={aboutRef}>
          <button
            onClick={() => setAboutOpen(!aboutOpen)}
            onMouseLeave={aboutOpen ? scheduleAboutClose : undefined}
            className={cn(
              "h-7 px-3 rounded-lg flex items-center gap-1.5 text-xs transition-fast text-muted-foreground hover:bg-accent/30 hover:text-foreground",
              aboutOpen && "bg-accent/30 text-foreground"
            )}
            title={t("about.title")}
          >
            <Info className="h-3.5 w-3.5 text-[var(--icon-about)]" />
            <span>{t("about.title")}</span>
          </button>
          {aboutOpen && (
            <div
              className="absolute left-0 top-full mt-1 w-56 rounded-lg border border-border bg-card shadow-lg z-50 p-4"
              onMouseEnter={cancelAboutClose}
              onMouseLeave={() => { setAboutHovered(false); setAboutOpen(false); }}
            >
              <div className="flex items-center gap-2 mb-2">
                <img src={logo} alt="" className="h-6 w-6 rounded" />
                <span className="text-sm font-semibold">Jishu Hub</span>
                {version && <span className="text-[11px] text-muted-foreground font-mono">v{version}</span>}
              </div>
              <div className="flex flex-col gap-1.5 mt-3">
                <button
                  onClick={() => invokeCommand("open_url", { url: "https://github.com/wang5766171/jishu-hub" }).catch(console.error)}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-fast w-full"
                >
                  <Github className="h-3.5 w-3.5 text-[var(--icon-config)]" />
                  <span>GitHub</span>
                </button>
                <button
                  onClick={() => invokeCommand("open_url", { url: "https://gitee.com/wangzwa/claude-hub" }).catch(console.error)}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-fast w-full"
                >
                  <Gitee className="h-3.5 w-3.5 text-[var(--icon-about)]" />
                  <span>Gitee</span>
                </button>
              </div>
            </div>
          )}
        </div>
        <button
          onClick={handleToggle}
          className={cn(
            "h-7 px-3 rounded-lg flex items-center gap-1.5 text-xs transition-fast",
            pinned ? "text-primary" : "text-muted-foreground hover:bg-accent/30 hover:text-foreground"
          )}
          title={pinned ? "取消置顶" : "置顶窗口"}
        >
          {pinned ? <PinOff className="h-3.5 w-3.5 text-[var(--icon-pin)]" /> : <Pin className="h-3.5 w-3.5 text-[var(--icon-pin)]" />}
          <span>{pinned ? t("about.unpin") : t("about.pin")}</span>
        </button>
      </div>
      <div className="flex-1" data-tauri-drag-region />
    </div>
  );
}

function App() {
  useTranslation();
  const [currentPage, setCurrentPage] = useState<Page>("chat");
  const [refreshing, setRefreshing] = useState(false);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const { data: projects, loading: projectsLoading, refetch: refetchProjects } = useInvoke<Project[]>("scan_projects");
  const { data: sessionNames, loading: namesLoading, refetch: refetchNames } = useInvoke<Record<string, string>>("get_session_names");

  // Startup: hooks start with loading=true (initial state, not a transition — reliable)
  // Refresh: refreshing flag set in event handler, cleared after awaiting actual Promises
  const loading = projectsLoading || namesLoading || refreshing;

  // Restore last project on startup
  useEffect(() => {
    if (projects && !currentProject) {
      invokeCommand<string | null>("load_last_project").then((lastEncoded) => {
        if (lastEncoded) {
          const found = projects.find(p => p.encoded_name === lastEncoded);
          if (found) setCurrentProject(found);
        }
      }).catch(console.error);
    }
  }, [projects]);

  // Refresh handler: directly await refetch Promises in the event handler
  const handleRefresh = useCallback(async (): Promise<number> => {
    setRefreshing(true);
    try {
      const newProjects = await refetchProjects();
      // Sync currentProject with refreshed data
      setCurrentProject(prev => {
        if (!prev) return null;
        return newProjects.find(p => p.encoded_name === prev.encoded_name) ?? null;
      });
      await refetchNames();
      return Date.now();
    } finally {
      setRefreshing(false);
    }
  }, [refetchProjects, refetchNames]);

  const handleEnterProject = useCallback((project: Project) => {
    setCurrentProject(project);
    invokeCommand("save_last_project", { encodedName: project.encoded_name }).catch(console.error);
    setCurrentPage("chat");
  }, []);

  const handleSwitchProject = useCallback(() => {
    setCurrentPage("manage");
  }, []);

  return (
    <div className="flex flex-col h-screen bg-background relative">
      <TitleBar currentPage={currentPage} onNavigate={setCurrentPage} disabled={loading} />
      <div className="flex-1 overflow-hidden">
        <div className={cn("h-full", currentPage !== "chat" && "hidden")}><ChatPage currentProject={currentProject} onRefresh={handleRefresh} sessionNames={sessionNames} refetchNames={refetchNames} onSwitchProject={handleSwitchProject} /></div>
        <div className={cn("h-full", currentPage !== "manage" && "hidden")}><ManagePage onBack={() => setCurrentPage("chat")} onEnterProject={handleEnterProject} /></div>
      </div>
      <div className="h-6 flex items-center px-4 text-[10px] text-muted-foreground/50 border-t border-border/30" data-tauri-drag-region>
        <span>{projects?.length ?? 0} projects</span>
      </div>
      {loading && <LoadingOverlay />}
    </div>
  );
}

export default App;
