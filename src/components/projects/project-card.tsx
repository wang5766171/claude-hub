import { Card, CardContent } from "@/components/ui/card";
import { FolderOpen, FileText, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import type { Project } from "@/types";

interface ProjectCardProps {
  project: Project;
  selected: boolean;
  onClick: () => void;
}

export function ProjectCard({ project, selected, onClick }: ProjectCardProps) {
  const { t } = useTranslation();
  return (
    <Card
      className={cn(
        "cursor-pointer transition-colors hover:border-primary/50",
        selected && "border-primary ring-1 ring-primary/20"
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-medium">{project.name}</h3>
          </div>
          {project.has_claude_md && (
            <FileText className="h-4 w-4 text-green-500" title={t("projects.hasClaudeMd")} />
          )}
        </div>
        <p className="mt-1 truncate text-xs text-muted-foreground" title={project.path}>
          {project.path}
        </p>
        <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <MessageSquare className="h-3 w-3" />
            {t("projects.sessionCount", { count: project.session_count })}
          </span>
          {project.last_active && <span>{project.last_active}</span>}
        </div>
      </CardContent>
    </Card>
  );
}
