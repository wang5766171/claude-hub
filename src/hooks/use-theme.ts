import { useState, useEffect, useCallback } from "react";
import { invokeCommand } from "@/hooks/use-invoke";

export type Theme = "light" | "colorful" | "dark";

const STORAGE_KEY = "jishu-hub-theme";

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return (stored as Theme) || "dark";
  });

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // Load persisted theme from backend on mount
  useEffect(() => {
    invokeCommand<string>("load_theme").then((t) => {
      if (t && ["light", "colorful", "dark"].includes(t)) {
        setThemeState(t as Theme);
        localStorage.setItem(STORAGE_KEY, t);
      }
    }).catch(() => {});
  }, []);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    localStorage.setItem(STORAGE_KEY, t);
    invokeCommand("save_theme", { theme: t }).catch(() => {});
  }, []);

  return { theme, setTheme };
}
