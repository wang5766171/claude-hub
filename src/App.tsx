import { useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { ProjectsPage } from "@/pages/projects-page";
import { SessionsPage } from "@/pages/sessions-page";
import { useInvoke } from "@/hooks/use-invoke";
import type { Page, Project, ClaudeConfig } from "@/types";

function App() {
  const [currentPage, setCurrentPage] = useState<Page>("projects");
  const { data: projects } = useInvoke<Project[]>("scan_projects");
  const { data: config } = useInvoke<ClaudeConfig>("load_config");

  const navigateToSession = (_encodedName: string) => {
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
      {currentPage === "sessions" && <SessionsPage />}
      {currentPage === "config" && (
        <div className="text-muted-foreground">Config management coming in P2</div>
      )}
      {currentPage === "commands" && (
        <div className="text-muted-foreground">Commands coming in P3</div>
      )}
    </AppLayout>
  );
}

export default App;
