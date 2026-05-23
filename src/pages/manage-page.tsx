import { useState } from "react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { ProjectsPage } from "./projects-page";
import { ConfigPage } from "./config-page";
import { CommandsPage } from "./commands-page";
import { FolderOpen, Settings, Rocket, Archive, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ManageTab } from "@/types";

interface ManagePageProps {
  onBack: () => void;
  onViewSessions: (encodedName: string) => void;
}

const tabs: { id: ManageTab; icon: typeof FolderOpen; labelKey: string }[] = [
  { id: "projects", icon: FolderOpen, labelKey: "nav.projects" },
  { id: "config", icon: Settings, labelKey: "nav.config" },
  { id: "commands", icon: Rocket, labelKey: "nav.commands" },
  { id: "backups", icon: Archive, labelKey: "config.backups" },
];

export function ManagePage({ onBack, onViewSessions }: ManagePageProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<ManageTab>("projects");

  return (
    <div className="flex h-full">
      {/* Left: Tab navigation */}
      <div className="w-16 flex flex-col items-center border-r border-border/30 py-4 gap-1" style={{ background: "var(--color-material-sidebar)", backdropFilter: "blur(20px)" }}>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onBack}
          className="mb-4 text-muted-foreground hover:text-foreground"
          title={t("sessions.title")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        {tabs.map(({ id, icon: Icon, labelKey }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={cn(
              "flex flex-col items-center gap-1 w-12 py-2 rounded-lg text-[10px] transition-fast",
              activeTab === id
                ? "bg-accent/80 text-accent-foreground font-medium"
                : "text-muted-foreground hover:bg-accent/30 hover:text-foreground"
            )}
            title={t(labelKey)}
          >
            <Icon className="h-4 w-4" />
            <span className="truncate w-full text-center">{t(labelKey)}</span>
          </button>
        ))}
      </div>

      {/* Right: Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === "projects" && <ProjectsPage onViewSessions={onViewSessions} />}
        {activeTab === "config" && <ConfigPage initialTab="edit" />}
        {activeTab === "commands" && <CommandsPage />}
        {activeTab === "backups" && <ConfigPage initialTab="backups" />}
      </div>
    </div>
  );
}
