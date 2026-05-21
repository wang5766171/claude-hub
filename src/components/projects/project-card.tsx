import { Card, CardContent } from "@/components/ui/card";
import { FolderOpen, FileText, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import type { Project, ProjectMeta } from "@/types";

interface ProjectCardProps {
  project: Project;
  selected: boolean;
  onClick: () => void;
  meta?: ProjectMeta;
  managementMode?: boolean;
  checked?: boolean;
  disabled?: boolean;
  onCheck?: () => void;
  mergedCount?: number;
  onTagClick?: (tag: string) => void;
}

export function ProjectCard({
  project,
  selected,
  onClick,
  meta,
  managementMode,
  checked,
  disabled,
  onCheck,
  mergedCount,
  onTagClick,
}: ProjectCardProps) {
  const { t } = useTranslation();
  const displayName = meta?.custom_name || project.name;

  return (
    <Card
      className={cn(
        "relative cursor-pointer transition-colors hover:border-primary/50",
        selected && "border-primary ring-1 ring-primary/20",
        disabled && managementMode && "opacity-50"
      )}
      onClick={managementMode ? undefined : onClick}
    >
      {managementMode && (
        <div
          className="absolute top-2 left-2 z-10"
          onClick={(e) => {
            e.stopPropagation();
            if (!disabled) onCheck?.();
          }}
        >
          <input
            type="checkbox"
            checked={checked}
            disabled={disabled}
            className="h-4 w-4"
          />
        </div>
      )}
      {disabled && managementMode && (
        <div className="absolute inset-0 bg-background/50 rounded-lg" />
      )}
      {mergedCount != null && mergedCount > 0 && (
        <div className="absolute top-2 right-2 z-10">
          <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] bg-primary/10 text-primary rounded">
            +{mergedCount} merged
          </span>
        </div>
      )}
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <FolderOpen className="h-4 w-4 text-muted-foreground shrink-0" />
            <h3 className="font-medium truncate">{displayName}</h3>
          </div>
          {!mergedCount && project.has_claude_md && (
            <FileText className="h-4 w-4 text-green-500 shrink-0" />
          )}
        </div>
        {meta?.custom_name && (
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {project.name}
          </p>
        )}
        <p className="mt-1 truncate text-xs text-muted-foreground" title={project.path}>
          {project.path}
        </p>
        {meta?.tags && meta.tags.length > 0 && (
          <div className="flex gap-1 mt-1 flex-wrap">
            {meta.tags.slice(0, 2).map(tag => (
              <span
                key={tag}
                className="inline-flex items-center px-1.5 py-0.5 text-[10px] bg-secondary text-secondary-foreground rounded cursor-pointer hover:bg-primary/20 hover:text-primary transition-colors"
                onClick={(e) => { e.stopPropagation(); onTagClick?.(tag); }}
              >
                {tag}
              </span>
            ))}
            {meta.tags.length > 2 && (
              <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] bg-muted text-muted-foreground rounded">
                +{meta.tags.length - 2}
              </span>
            )}
          </div>
        )}
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
