import { FolderOpen, MessageSquare, Settings, Rocket } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Page } from "@/types";

interface SidebarProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
}

const navItems: { page: Page; icon: typeof FolderOpen; label: string }[] = [
  { page: "projects", icon: FolderOpen, label: "Projects" },
  { page: "sessions", icon: MessageSquare, label: "Sessions" },
  { page: "config", icon: Settings, label: "Config" },
  { page: "commands", icon: Rocket, label: "Commands" },
];

export function Sidebar({ currentPage, onNavigate }: SidebarProps) {
  return (
    <aside className="flex w-52 flex-col border-r border-border bg-card">
      <div className="border-b border-border p-4">
        <h1 className="text-lg font-semibold">Claude Hub</h1>
        <p className="text-xs text-muted-foreground">v0.1.0</p>
      </div>
      <nav className="flex-1 p-2">
        {navItems.map(({ page, icon: Icon, label }) => (
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
            {label}
          </button>
        ))}
      </nav>
    </aside>
  );
}
