import { useState } from "react";
import "@/i18n";
import { AppLayout } from "@/components/layout/app-layout";
import { ProjectsPage } from "@/pages/projects-page";
import { SessionsPage } from "@/pages/sessions-page";
import { ConfigPage } from "@/pages/config-page";
import { CommandsPage } from "@/pages/commands-page";
import { useInvoke } from "@/hooks/use-invoke";
import { useTranslation } from "react-i18next";
import type { Page, Project } from "@/types";

function App() {
  useTranslation();
  const [currentPage, setCurrentPage] = useState<Page>("projects");
  const [initialProject, setInitialProject] = useState<string | null>(null);
  const { data: projects } = useInvoke<Project[]>("scan_projects");

  const navigateToSession = (encodedName: string) => {
    setInitialProject(encodedName);
    setCurrentPage("sessions");
  };

  return (
    <AppLayout
      currentPage={currentPage}
      onNavigate={setCurrentPage}
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
      {currentPage === "commands" && <CommandsPage />}
    </AppLayout>
  );
}

export default App;
