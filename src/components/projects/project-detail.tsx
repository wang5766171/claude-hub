import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { X, ExternalLink } from "lucide-react";
import { MessageSquare } from "lucide-react";
import type { Project } from "@/types";

interface ProjectDetailProps {
  project: Project;
  onClose: () => void;
  onViewSessions: (encodedName: string) => void;
}

export function ProjectDetail({ project, onClose, onViewSessions }: ProjectDetailProps) {
  return (
    <div className="fixed inset-y-0 right-0 z-10 w-96 border-l border-border bg-card shadow-lg">
      <div className="flex items-center justify-between border-b border-border p-4">
        <h2 className="font-semibold">{project.name}</h2>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="p-4 space-y-4">
        <Card>
          <CardContent className="p-3 space-y-2 text-sm">
            <div>
              <span className="text-muted-foreground">Path:</span>
              <p className="font-mono text-xs break-all">{project.path}</p>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-muted-foreground">Sessions</span>
              <span className="font-medium">{project.session_count}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Last Active</span>
              <span className="font-medium">{project.last_active ?? "N/A"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">CLAUDE.md</span>
              <span className={project.has_claude_md ? "text-green-500" : "text-muted-foreground"}>
                {project.has_claude_md ? "Yes" : "No"}
              </span>
            </div>
          </CardContent>
        </Card>
        <div className="space-y-2">
          <Button className="w-full" onClick={() => onViewSessions(project.encoded_name)}>
            <MessageSquare className="mr-2 h-4 w-4" />
            View Sessions
          </Button>
          <Button variant="outline" className="w-full" disabled>
            <ExternalLink className="mr-2 h-4 w-4" />
            Open in Terminal
          </Button>
        </div>
      </div>
    </div>
  );
}
