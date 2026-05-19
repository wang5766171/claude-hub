import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, FolderOpen } from "lucide-react";
import { useInvoke } from "@/hooks/use-invoke";
import { ProjectCard } from "@/components/projects/project-card";
import { ProjectDetail } from "@/components/projects/project-detail";
import { AddProjectDialog } from "@/components/projects/add-project-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import type { Project } from "@/types";

interface ProjectsPageProps {
  onViewSessions?: (encodedName: string) => void;
}

export function ProjectsPage({ onViewSessions }: ProjectsPageProps) {
  const { data: projects, loading, refetch } = useInvoke<Project[]>("scan_projects");
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  const handleProjectAdded = () => {
    refetch();
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-32" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Projects</h2>
        <Button onClick={() => setAddDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Project
        </Button>
      </div>

      {!projects || projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <FolderOpen className="h-12 w-12 mb-4" />
          <p>No projects found</p>
          <p className="text-sm">Add a project with a .claude directory to get started</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard
              key={project.encoded_name}
              project={project}
              selected={selectedProject?.encoded_name === project.encoded_name}
              onClick={() => setSelectedProject(project)}
            />
          ))}
        </div>
      )}

      {selectedProject && (
        <ProjectDetail
          project={selectedProject}
          onClose={() => setSelectedProject(null)}
          onViewSessions={(name) => onViewSessions?.(name)}
        />
      )}

      <AddProjectDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onAdded={handleProjectAdded}
      />
    </div>
  );
}
