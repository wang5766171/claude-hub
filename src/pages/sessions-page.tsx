import { useState, useMemo } from "react";
import { useInvoke, invokeCommand } from "@/hooks/use-invoke";
import { SessionList } from "@/components/sessions/session-list";
import { MessageView } from "@/components/sessions/message-view";
import { RenameSessionDialog } from "@/components/sessions/rename-session-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageSquare, Pencil, Search, RotateCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { searchSessions } from "@/lib/session-search";
import type { Session, Project, Message, SessionSearchResult } from "@/types";

interface SessionsPageProps {
  initialProject?: string | null;
  onConsumedInitial?: () => void;
}

export function SessionsPage({ initialProject, onConsumedInitial }: SessionsPageProps) {
  const { t } = useTranslation();
  const { data: projects, loading: projectsLoading } = useInvoke<Project[]>("scan_projects");
  const { data: sessionNames, refetch: refetchNames } = useInvoke<Record<string, string>>("get_session_names");

  const [selectedProject, setSelectedProject] = useState<string | null>(initialProject ?? null);

  if (initialProject && onConsumedInitial) {
    onConsumedInitial();
  }
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [sessionMessages, setSessionMessages] = useState<Message[]>([]);
  const [renameOpen, setRenameOpen] = useState(false);
  const [globalSearchQuery, setGlobalSearchQuery] = useState("");
  const [activeSearchQuery, setActiveSearchQuery] = useState("");

  const { data: sessions } = useInvoke<Session[]>(
    selectedProject ? "list_sessions" : "",
    selectedProject ? { encodedName: selectedProject } : undefined
  );

  const searchResults = useMemo<SessionSearchResult[]>(() => {
    if (!sessions || !activeSearchQuery.trim()) return [];
    return searchSessions(sessions, activeSearchQuery);
  }, [sessions, activeSearchQuery]);

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

  const handleSelectProject = (encodedName: string) => {
    setSelectedProject(encodedName);
    setSelectedSession(null);
    setSessionMessages([]);
    setGlobalSearchQuery("");
    setActiveSearchQuery("");
  };

  const handleResumeSession = async (sessionId: string, _sessionPath: string) => {
    const project = projects?.find((p) => p.encoded_name === selectedProject);
    if (!project) return;
    await invokeCommand("open_in_terminal", {
      projectPath: project.path,
      resumeSessionId: sessionId,
    });
  };

  const handleRefreshMessages = async () => {
    if (selectedSession && selectedProject) {
      try {
        const msgs = await invokeCommand<Message[]>("get_session_messages", {
          sessionId: selectedSession,
          encodedName: selectedProject,
        });
        setSessionMessages(msgs);
      } catch (e) {
        console.error(e);
      }
    }
  };

  if (projectsLoading) {
    return <Skeleton className="h-64" />;
  }

  const currentSession = sessions?.find((s) => s.id === selectedSession);
  const displayName = selectedSession && sessionNames
    ? sessionNames[selectedSession] || selectedSession.slice(0, 8)
    : "";

  return (
    <div className="h-full overflow-x-auto">
      <div className="flex h-full min-w-[780px]">
      {/* Column 1: Project selector */}
      <div className="w-48 shrink-0 border-r border-border overflow-hidden flex flex-col">
        <h3 className="text-sm font-medium text-muted-foreground px-2 py-2">{t("sessions.projects")}</h3>
        <div className="space-y-0.5 overflow-y-auto flex-1">
          {projects?.filter((p) => p.session_count > 0).map((project) => (
            <button
              key={project.encoded_name}
              onClick={() => handleSelectProject(project.encoded_name)}
              className={`block w-full rounded px-2 py-1.5 text-left text-sm truncate ${
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

      {/* Column 2: Session list */}
      <div className="w-72 shrink-0 border-r border-border flex flex-col">
        {!selectedProject ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <MessageSquare className="h-8 w-8 mb-2" />
            <p className="text-sm">{t("sessions.selectProject")}</p>
          </div>
        ) : (
          <div className="flex flex-col h-full">
            <div className="px-3 py-2 border-b border-border">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={globalSearchQuery}
                  onChange={(e) => {
                    setGlobalSearchQuery(e.target.value);
                    setActiveSearchQuery(e.target.value);
                  }}
                  placeholder={t("sessions.searchAll")}
                  className="h-8 pl-8 text-sm"
                />
              </div>
              {activeSearchQuery && searchResults.length > 0 && (
                <div className="mt-1 text-xs text-muted-foreground">
                  {t("sessions.foundSessions", { count: searchResults.length })}
                </div>
              )}
              {activeSearchQuery && searchResults.length === 0 && (
                <div className="mt-1 text-xs text-muted-foreground">
                  {t("sessions.noSessionsFound")}
                </div>
              )}
            </div>
            <div className="flex-1 overflow-y-auto">
              {sessions && sessionNames && (
                <SessionList
                  sessions={sessions}
                  sessionNames={sessionNames}
                  selectedId={selectedSession}
                  onSelect={handleSelectSession}
                  searchQuery={activeSearchQuery}
                  searchResults={searchResults.length > 0 ? searchResults : undefined}
                  onResumeSession={handleResumeSession}
                />
              )}
            </div>
          </div>
        )}
      </div>

      {/* Column 3: Message view */}
      <div className="flex-1 flex flex-col min-w-[300px]">
        {!selectedSession || !currentSession ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <p>{t("sessions.selectSession")}</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between border-b border-border px-4 py-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-medium text-sm truncate">{displayName}</span>
                <span className="text-xs text-muted-foreground">{selectedSession.slice(0, 8)}</span>
              </div>
              <Button variant="ghost" size="icon-xs" onClick={() => setRenameOpen(true)}>
                <Pencil className="h-3 w-3" />
              </Button>
            </div>
            <div className="flex-1 min-h-0">
              <MessageView messages={sessionMessages} initialSearchQuery={activeSearchQuery} onRefresh={handleRefreshMessages} />
            </div>
          </>
        )}
      </div>
      </div>

      <RenameSessionDialog
        open={renameOpen}
        onOpenChange={setRenameOpen}
        sessionId={selectedSession ?? ""}
        currentName={displayName}
        onRenamed={refetchNames}
      />
    </div>
  );
}
