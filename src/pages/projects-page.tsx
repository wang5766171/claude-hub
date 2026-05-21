import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Plus, FolderOpen, Settings2 } from "lucide-react";
import { useInvoke, invokeCommand } from "@/hooks/use-invoke";
import { ProjectCard } from "@/components/projects/project-card";
import { ProjectDetail } from "@/components/projects/project-detail";
import { AddProjectDialog } from "@/components/projects/add-project-dialog";
import { MergeDialog } from "@/components/projects/merge-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import type { Project, ProjectMeta, ProjectMergeInfo } from "@/types";

interface ProjectsPageProps {
  onViewSessions?: (encodedName: string) => void;
}

function getLevel1FromPath(path: string): string | null {
  // Normalize path separators to backslash for Windows
  const normalized = path.replace(/\//g, "\\");
  const parts = normalized.split("\\");
  if (parts.length < 2) return null;
  // e.g. "D:\MyCodes\claude-hub" -> parts[0]="D:", parts[1]="MyCodes"
  // Level1 = "D:\MyCodes"
  return parts[0] + "\\" + parts[1];
}

export function ProjectsPage({ onViewSessions }: ProjectsPageProps) {
  const { t } = useTranslation();
  const { data: projects, loading, refetch } = useInvoke<Project[]>("scan_projects");
  const { data: projectMetas, refetch: refetchMetas } = useInvoke<Record<string, ProjectMeta>>("load_project_metas");
  const { data: merges, refetch: refetchMerges } = useInvoke<ProjectMergeInfo>("get_project_merges");

  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  // Management mode state
  const [managementMode, setManagementMode] = useState(false);
  const [checkedProjects, setCheckedProjects] = useState<Set<string>>(new Set());
  const [level1Filter, setLevel1Filter] = useState<string | null>(null);
  const [mergeDialogOpen, setMergeDialogOpen] = useState(false);

  const handleProjectAdded = () => {
    refetch();
  };

  const handleCheck = async (encodedName: string) => {
    const newChecked = new Set(checkedProjects);
    if (newChecked.has(encodedName)) {
      newChecked.delete(encodedName);
      if (newChecked.size === 0) {
        setLevel1Filter(null);
      }
    } else {
      // If this is the first check, set the level1 filter
      if (newChecked.size === 0) {
        const project = projects?.find(p => p.encoded_name === encodedName);
        if (project) {
          const level1 = getLevel1FromPath(project.path);
          setLevel1Filter(level1);
        }
      }
      newChecked.add(encodedName);
    }
    setCheckedProjects(newChecked);
  };

  const toggleManagementMode = () => {
    setManagementMode(!managementMode);
    setCheckedProjects(new Set());
    setLevel1Filter(null);
  };

  const clearSelection = () => {
    setCheckedProjects(new Set());
    setLevel1Filter(null);
  };

  const handleMergeComplete = () => {
    refetch();
    refetchMerges();
    setCheckedProjects(new Set());
    setLevel1Filter(null);
    setManagementMode(false);
  };

  // Compute merged count for each project
  const getMergedCount = (encodedName: string): number => {
    if (!merges || !merges[encodedName]) return 0;
    return merges[encodedName].length;
  };

  // Determine if a project is disabled (different level1 from filter)
  const isDisabled = (project: Project): boolean => {
    if (!managementMode || level1Filter === null) return false;
    if (checkedProjects.has(project.encoded_name)) return false;
    return getLevel1FromPath(project.path) !== level1Filter;
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
    <div className="space-y-6 p-6 h-full overflow-auto pb-20">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">{t("projects.title")}</h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={toggleManagementMode}>
            <Settings2 className="h-4 w-4 mr-1" />
            {managementMode ? "退出管理" : "管理"}
          </Button>
          <Button onClick={() => setAddDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            {t("projects.addProject")}
          </Button>
        </div>
      </div>

      {!projects || projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <FolderOpen className="h-12 w-12 mb-4" />
          <p>{t("projects.noProjects")}</p>
          <p className="text-sm">{t("projects.noProjectsDesc")}</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard
              key={project.encoded_name}
              project={project}
              selected={selectedProject?.encoded_name === project.encoded_name}
              onClick={() => setSelectedProject(project)}
              meta={projectMetas?.[project.encoded_name]}
              managementMode={managementMode}
              checked={checkedProjects.has(project.encoded_name)}
              disabled={isDisabled(project)}
              onCheck={() => handleCheck(project.encoded_name)}
              mergedCount={getMergedCount(project.encoded_name)}
            />
          ))}
        </div>
      )}

      {selectedProject && (
        <ProjectDetail
          project={selectedProject}
          onClose={() => setSelectedProject(null)}
          onViewSessions={(name) => onViewSessions?.(name)}
          onRemoved={() => { setSelectedProject(null); refetch(); }}
          projectMetas={projectMetas}
          onUpdateMetas={refetchMetas}
          merges={merges}
          onSplit={handleMergeComplete}
        />
      )}

      <AddProjectDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onAdded={handleProjectAdded}
      />

      {managementMode && checkedProjects.size >= 2 && (
        <div className="fixed bottom-0 left-0 right-0 border-t bg-background p-3 flex items-center justify-between z-50">
          <span className="text-sm">已选择 {checkedProjects.size} 个项目</span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={clearSelection}>取消选择</Button>
            <Button onClick={() => setMergeDialogOpen(true)}>合并项目</Button>
          </div>
        </div>
      )}

      {mergeDialogOpen && checkedProjects.size >= 2 && (
        <MergeDialog
          open={mergeDialogOpen}
          onOpenChange={setMergeDialogOpen}
          primary={[...checkedProjects][0]}
          secondaries={[...checkedProjects].slice(1)}
          onMergeComplete={handleMergeComplete}
        />
      )}
    </div>
  );
}
