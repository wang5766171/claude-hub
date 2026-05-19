import { useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { ProjectsPage } from "@/pages/projects-page";
import { SessionsPage } from "@/pages/sessions-page";
import { ConfigPage } from "@/pages/config-page";
import { useInvoke } from "@/hooks/use-invoke";
import type { Page, Project, ClaudeConfig } from "@/types";

function App() {
  const [currentPage, setCurrentPage] = useState<Page>("projects");
  const [initialProject, setInitialProject] = useState<string | null>(null);
  const { data: projects } = useInvoke<Project[]>("scan_projects");
  const { data: config } = useInvoke<ClaudeConfig>("load_config");

  const navigateToSession = (encodedName: string) => {
    setInitialProject(encodedName);
    setCurrentPage("sessions");
  };

  return (
    <AppLayout
      currentPage={currentPage}
      onNavigate={setCurrentPage}
      modelName={config?.model ?? null}
      projectCount={projects?.length ?? 0}
    >
      {currentPage === "projects" && (
        <ProjectsPage onViewSessions={navigateToSession} />
      )}
      {currentPage === "sessions" && (
        <SessionsPage
          initialProject={initialProject}
          onConsumedInitial={() => setInitialProject(null)}
        />
      )}
      {currentPage === "config" && <ConfigPage />}
      {currentPage === "commands" && (
        <div className="text-muted-foreground">Commands coming in P3</div>
      )}
    </AppLayout>
  );
}

export default App;
