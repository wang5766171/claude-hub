import { FolderOpen, MessageSquare, Settings, Rocket } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import type { Page } from "@/types";

interface SidebarProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
}

const navItems: { page: Page; icon: typeof FolderOpen; labelKey: string }[] = [
  { page: "projects", icon: FolderOpen, labelKey: "nav.projects" },
  { page: "sessions", icon: MessageSquare, labelKey: "nav.sessions" },
  { page: "config", icon: Settings, labelKey: "nav.config" },
  { page: "commands", icon: Rocket, labelKey: "nav.commands" },
];

export function Sidebar({ currentPage, onNavigate }: SidebarProps) {
  const { t } = useTranslation();
  return (
    <aside className="flex w-52 flex-col border-r border-border bg-card">
      <div className="border-b border-border p-4">
        <h1 className="text-lg font-semibold">Claude Hub</h1>
        <p className="text-xs text-muted-foreground">v0.1.0</p>
      </div>
      <nav className="flex-1 p-2">
        {navItems.map(({ page, icon: Icon, labelKey }) => (
          <button
            key={page}
            onClick={() => onNavigate(page)}
            className={cn(
              "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
              currentPage === page
                ? "bg-accent text-accent-foreground font-medium"
                : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
            {t(labelKey)}
          </button>
        ))}
      </nav>
    </aside>
  );
}
