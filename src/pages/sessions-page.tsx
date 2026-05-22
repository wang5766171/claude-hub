import { useState, useMemo, useEffect } from "react";
import { useInvoke, invokeCommand } from "@/hooks/use-invoke";
import { SessionList } from "@/components/sessions/session-list";
import { MessageView } from "@/components/sessions/message-view";
import { RenameSessionDialog } from "@/components/sessions/rename-session-dialog";
import { ChatInput } from "@/components/sessions/chat-input";
import { StreamingMessage } from "@/components/sessions/streaming-message";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageSquare, Pencil, Search, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { listen } from "@tauri-apps/api/event";
import { searchSessions } from "@/lib/session-search";
import type { Session, Project, Message, SessionSearchResult, StreamChunk } from "@/types";

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
  const [projectCollapsed, setProjectCollapsed] = useState(false);
  const [sessionCollapsed, setSessionCollapsed] = useState(false);
  const [streamChunks, setStreamChunks] = useState<StreamChunk[]>([]);
  const [streamingSession, setStreamingSession] = useState<string | null>(null);
  const [loadingSessionId, setLoadingSessionId] = useState<string | null>(null);

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

  const handleNewSession = async () => {
    const project = projects?.find((p) => p.encoded_name === selectedProject);
    if (!project) return;
    try {
      await invokeCommand<number>("open_in_terminal", {
        projectPath: project.path,
      });
    } catch (err) {
      console.error("Failed to start new session:", err);
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
    setLoadingSessionId(sessionId);
    try {
      // Check if terminal is already open
      const existing = await invokeCommand<{ pid: number; project_path: string; started_at: string } | null>("get_terminal_session", { sessionId });
      if (existing) {
        // Terminal already open — clear loading
        setLoadingSessionId(null);
        return;
      }
      // No existing terminal, open new one
      const session = sessions?.find(s => s.id === sessionId);
      const project = projects?.find((p) => p.encoded_name === selectedProject);
      const cwd = session?.project_path || project?.path;
      if (!cwd) return;
      const pid = await invokeCommand<number>("open_in_terminal", {
        projectPath: cwd,
        resumeSessionId: sessionId,
      });
      await invokeCommand("register_terminal_session", {
        sessionId,
        pid,
        projectPath: cwd,
      });
    } catch (err) {
      console.error("Failed to resume session:", err);
    } finally {
      setLoadingSessionId(null);
    }
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

  useEffect(() => {
    let unlistenFn: (() => void) | null = null;
    listen<StreamChunk>("chat-stream", (event) => {
      const chunk = event.payload;
      if (chunk.session_id === streamingSession || chunk.session_id.startsWith("pending-")) {
        setStreamChunks((prev) => [...prev, chunk]);
        if (chunk.event_type === "result") {
          setStreamingSession(null);
          handleRefreshMessages();
        }
      }
    }).then((fn) => {
      unlistenFn = fn;
    });
    return () => {
      if (unlistenFn) unlistenFn();
    };
  }, [streamingSession]);

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
      {projectCollapsed ? (
        <div
          className="w-2 shrink-0 border-r border-border bg-muted/30 flex items-center justify-center cursor-pointer hover:bg-muted/50 transition-all duration-200"
          onClick={() => setProjectCollapsed(false)}
        >
          <ChevronRight className="h-3 w-3 text-muted-foreground" />
        </div>
      ) : (
        <div className="w-48 shrink-0 border-r border-border overflow-hidden flex flex-col transition-all duration-200 relative">
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
          <button
            className="absolute -right-3 top-1/2 -translate-y-1/2 z-10 rounded-full bg-border w-6 h-6 flex items-center justify-center hover:bg-border/80"
            onClick={() => setProjectCollapsed(true)}
          >
            <ChevronLeft className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* Column 2: Session list */}
      {sessionCollapsed ? (
        <div
          className="w-2 shrink-0 border-r border-border bg-muted/30 flex items-center justify-center cursor-pointer hover:bg-muted/50 transition-all duration-200"
          onClick={() => setSessionCollapsed(false)}
        >
          <ChevronRight className="h-3 w-3 text-muted-foreground" />
        </div>
      ) : (
        <div className="w-72 shrink-0 border-r border-border flex flex-col transition-all duration-200 relative">
          {!selectedProject ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <MessageSquare className="h-8 w-8 mb-2" />
              <p className="text-sm">{t("sessions.selectProject")}</p>
            </div>
          ) : (
            <div className="flex flex-col h-full">
              <div className="px-3 py-2 border-b border-border">
                <div className="flex items-center gap-1.5">
                  <div className="relative flex-1">
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
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={handleNewSession}
                    title={t("sessions.newSession")}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
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
                    loadingSessionId={loadingSessionId}
                  />
                )}
              </div>
            </div>
          )}
          <button
            className="absolute -right-3 top-1/2 -translate-y-1/2 z-10 rounded-full bg-border w-6 h-6 flex items-center justify-center hover:bg-border/80"
            onClick={() => setSessionCollapsed(true)}
          >
            <ChevronLeft className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* Column 3: Message view + Chat input */}
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
        {selectedProject && (
          <>
            {streamingSession && streamChunks.length > 0 && (
              <StreamingMessage chunks={streamChunks} isComplete={!streamingSession} />
            )}
            <ChatInput
              sessionId={selectedSession}
              projectPath={projects?.find((p) => p.encoded_name === selectedProject)?.path ?? null}
              onMessageSent={(sid) => setStreamingSession(sid)}
              onStreamChunk={(chunk) => {
                setStreamChunks(prev => [...prev, chunk]);
              }}
              onStreamComplete={() => {
                setStreamingSession(null);
                setStreamChunks([]);
                handleRefreshMessages();
              }}
            />
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
