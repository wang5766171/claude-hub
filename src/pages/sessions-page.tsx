import { useState } from "react";
import { useInvoke, invokeCommand } from "@/hooks/use-invoke";
import { SessionList } from "@/components/sessions/session-list";
import { SessionDetail } from "@/components/sessions/session-detail";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquare } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { Session, Project, Message } from "@/types";

interface SessionsPageProps {
  initialProject?: string | null;
  onConsumedInitial?: () => void;
}

export function SessionsPage({ initialProject, onConsumedInitial }: SessionsPageProps) {
  const { t } = useTranslation();
  const { data: projects, loading: projectsLoading } = useInvoke<Project[]>("scan_projects");
  const { data: sessionNames, refetch: refetchNames } = useInvoke<Record<string, string>>("get_session_names");

  const [selectedProject, setSelectedProject] = useState<string | null>(initialProject ?? null);

  // Consume initial project after first render
  if (initialProject && onConsumedInitial) {
    onConsumedInitial();
  }
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [sessionMessages, setSessionMessages] = useState<Message[]>([]);

  const { data: sessions } = useInvoke<Session[]>(
    selectedProject ? "list_sessions" : "",
    selectedProject ? { encodedName: selectedProject } : undefined
  );

  const handleSelectSession = async (sessionId: string) => {
    setSelectedSession(sessionId);
    if (selectedProject) {
      const messages = await invokeCommand<Message[]>("get_session_messages", {
        sessionId,
        encodedName: selectedProject,
      });
      setSessionMessages(messages);
    }
  };

  const handleBack = () => {
    setSelectedSession(null);
    setSessionMessages([]);
  };

  if (projectsLoading) {
    return <Skeleton className="h-64" />;
  }

  const currentSession = sessions?.find((s) => s.id === selectedSession);
  const displayName = selectedSession && sessionNames
    ? sessionNames[selectedSession] || selectedSession.slice(0, 8)
    : "";

  return (
    <div className="flex h-[calc(100vh-5rem)] gap-4">
      {/* Project selector */}
      <div className="w-48 shrink-0 space-y-2">
        <h3 className="text-sm font-medium text-muted-foreground">{t("sessions.projects")}</h3>
        <div className="space-y-1">
          {projects?.filter((p) => p.session_count > 0).map((project) => (
            <button
              key={project.encoded_name}
              onClick={() => {
                setSelectedProject(project.encoded_name);
                setSelectedSession(null);
              }}
              className={`block w-full rounded px-2 py-1 text-left text-sm truncate ${
                selectedProject === project.encoded_name
                  ? "bg-accent font-medium"
                  : "text-muted-foreground hover:bg-accent/50"
              }`}
            >
              {project.name}
            </button>
          ))}
        </div>
      </div>

      {/* Session list or detail */}
      <div className="w-80 shrink-0 border-l border-border pl-4">
        {!selectedProject ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <MessageSquare className="h-8 w-8 mb-2" />
            <p className="text-sm">{t("sessions.selectProject")}</p>
          </div>
        ) : selectedSession && currentSession ? (
          <SessionDetail
            sessionId={selectedSession}
            displayName={displayName}
            messages={sessionMessages}
            onBack={handleBack}
            onRenamed={refetchNames}
          />
        ) : (
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground">{t("sessions.title")}</h3>
            {sessions && sessionNames && (
              <SessionList
                sessions={sessions}
                sessionNames={sessionNames}
                selectedId={null}
                onSelect={handleSelectSession}
              />
            )}
          </div>
        )}
      </div>

      {/* Empty state for message area */}
      {!selectedSession && (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          <p>{t("sessions.selectSession")}</p>
        </div>
      )}
    </div>
  );
}
