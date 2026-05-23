import { useState, useMemo, useEffect, useLayoutEffect, useRef } from "react";
import { useInvoke, invokeCommand } from "@/hooks/use-invoke";
import { MessageView } from "@/components/sessions/message-view";
import { RenameSessionDialog } from "@/components/sessions/rename-session-dialog";
import { ChatInput } from "@/components/sessions/chat-input";
import { StreamingMessage } from "@/components/sessions/streaming-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  MessageSquare, Search, ChevronLeft, ChevronRight, Plus, X, Pencil,
  ChevronDown, ChevronRight as ChevRight, FolderOpen, Settings,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { listen } from "@tauri-apps/api/event";
import { searchSessions } from "@/lib/session-search";
import { cn } from "@/lib/utils";
import type { Session, Project, Message, ContentBlock, SessionSearchResult, StreamChunk } from "@/types";

export function ChatPage({ onOpenManage }: { onOpenManage: () => void }) {
  const { t } = useTranslation();
  const { data: projects, loading: projectsLoading } = useInvoke<Project[]>("scan_projects");
  const { data: sessionNames, refetch: refetchNames } = useInvoke<Record<string, string>>("get_session_names");

  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [sessionMessages, setSessionMessages] = useState<Message[]>([]);
  const [renameOpen, setRenameOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSearchQuery, setActiveSearchQuery] = useState("");
  const [collapsedProjects, setCollapsedProjects] = useState<Set<string>>(new Set());
  const [streamChunks, setStreamChunks] = useState<StreamChunk[]>([]);
  const [streamingSession, setStreamingSession] = useState<string | null>(null);
  const [streamComplete, setStreamComplete] = useState(false);
  const [loadingSessionId, setLoadingSessionId] = useState<string | null>(null);
  const [pendingUserMessage, setPendingUserMessage] = useState<string | null>(null);
  const [msgSearchSeed, setMsgSearchSeed] = useState("");
  const messageAreaRef = useRef<HTMLDivElement>(null);
  const streamChunksRef = useRef<StreamChunk[]>([]);
  const visitedSessions = useRef(new Set<string>());
  const scrollMemory = useRef(new Map<string, number>());
  const scrollAction = useRef<{ type: "bottom" } | { type: "restore"; top: number } | null>(null);
  const streamingActive = streamingSession || streamComplete;

  // Auto-select first project with sessions
  useEffect(() => {
    if (projects && projects.length > 0 && !selectedProject) {
      const withSessions = projects.filter(p => p.session_count > 0);
      if (withSessions.length > 0) {
        setSelectedProject(withSessions[0].encoded_name);
      }
    }
  }, [projects]);

  useLayoutEffect(() => {
    if (!scrollAction.current || !messageAreaRef.current) return;
    const action = scrollAction.current;
    scrollAction.current = null;
    if (action.type === "bottom") {
      messageAreaRef.current.scrollTop = messageAreaRef.current.scrollHeight;
    } else {
      messageAreaRef.current.scrollTop = action.top;
    }
  }, [sessionMessages]);

  const { data: sessions, refetch: refetchSessions } = useInvoke<Session[]>(
    selectedProject ? "list_sessions" : "",
    selectedProject ? { encodedName: selectedProject } : undefined
  );

  const _searchResults = useMemo<SessionSearchResult[]>(() => {
    if (!sessions || !activeSearchQuery.trim()) return [];
    return searchSessions(sessions, activeSearchQuery);
  }, [sessions, activeSearchQuery]);
  void _searchResults;

  const handleSelectSession = async (sessionId: string, projectName?: string) => {
    const targetProject = projectName || selectedProject;
    if (!targetProject) return;

    if (selectedSession && messageAreaRef.current) {
      scrollMemory.current.set(selectedSession, messageAreaRef.current.scrollTop);
    }
    const isFirstVisit = !visitedSessions.current.has(sessionId);
    setSelectedSession(sessionId);
    setSelectedProject(targetProject);
    setMsgSearchSeed(activeSearchQuery);

    const messages = await invokeCommand<Message[]>("get_session_messages", {
      sessionId,
      encodedName: targetProject,
    });
    setSessionMessages(messages);

    if (isFirstVisit) {
      scrollAction.current = { type: "bottom" };
      visitedSessions.current.add(sessionId);
    } else {
      const saved = scrollMemory.current.get(sessionId);
      scrollAction.current = saved !== undefined
        ? { type: "restore", top: saved }
        : { type: "bottom" };
    }
  };

  const handleNewSession = async () => {
    const project = projects?.find((p) => p.encoded_name === selectedProject);
    if (!project) return;
    try {
      await invokeCommand<number>("open_in_terminal", { projectPath: project.path });
    } catch (err) {
      console.error("Failed to start new session:", err);
    }
  };

  const handleResumeSession = async (sessionId: string) => {
    setLoadingSessionId(sessionId);
    try {
      const existing = await invokeCommand<{ pid: number; project_path: string; started_at: string } | null>(
        "find_session_terminal", { sessionId }
      );
      if (existing) {
        try { await invokeCommand<boolean>("focus_session_terminal", { sessionId }); } catch {}
        setLoadingSessionId(null);
        return;
      }
      const session = sessions?.find(s => s.id === sessionId);
      const project = projects?.find((p) => p.encoded_name === selectedProject);
      const cwd = session?.project_path || project?.path;
      if (!cwd) return;
      const pid = await invokeCommand<number>("open_in_terminal", {
        projectPath: cwd,
        resumeSessionId: sessionId,
      });
      await invokeCommand("register_terminal_session", {
        sessionId, pid, projectPath: cwd,
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

  // Stream listener
  useEffect(() => {
    let unlistenFn: (() => void) | null = null;
    listen<StreamChunk>("chat-stream", (event) => {
      const chunk = event.payload;
      if (chunk.session_id === streamingSession || chunk.session_id.startsWith("pending-")) {
        streamChunksRef.current = [...streamChunksRef.current, chunk];
        setStreamChunks((prev) => [...prev, chunk]);
        if (chunk.event_type === "result") {
          let text = "";
          const tools: Array<{ type: "tool_use"; id: string; name: string; input: unknown }> = [];
          for (const c of streamChunksRef.current) {
            if (c.event_type === "delta") {
              const delta = (c.data as Record<string, unknown>)?.event as Record<string, unknown> | undefined;
              const deltaObj = delta?.delta as Record<string, unknown> | undefined;
              if (deltaObj?.type === "text_delta" && typeof deltaObj.text === "string") {
                text += deltaObj.text;
              }
            } else if (c.event_type === "message") {
              const content = (c.data as Record<string, unknown>)?.content as Array<Record<string, unknown>> | undefined;
              if (content) {
                for (const block of content) {
                  if (block.type === "text" && typeof block.text === "string") text += block.text;
                  else if (block.type === "tool_use") tools.push({ type: "tool_use", id: block.id as string ?? "", name: block.name as string, input: block.input });
                }
              }
            }
          }

          const newMessages: Message[] = [];
          if (pendingUserMessage) {
            newMessages.push({ role: "user", content: [{ type: "text", text: pendingUserMessage }], timestamp: Date.now() });
          }
          const assistantContent: ContentBlock[] = [];
          assistantContent.push(...tools);
          if (text) assistantContent.push({ type: "text", text });
          if (assistantContent.length > 0) {
            newMessages.push({ role: "assistant", content: assistantContent, timestamp: Date.now() });
          }

          setSessionMessages((prev) => [...prev, ...newMessages]);
          setStreamingSession(null);
          setStreamComplete(false);
          setStreamChunks([]);
          streamChunksRef.current = [];
          setPendingUserMessage(null);

          requestAnimationFrame(() => {
            if (messageAreaRef.current) {
              messageAreaRef.current.scrollTop = messageAreaRef.current.scrollHeight;
            }
          });

          setTimeout(() => { refetchSessions(); refetchNames(); }, 2000);
        }
      }
    }).then((fn) => { unlistenFn = fn; });
    return () => { if (unlistenFn) unlistenFn(); };
  }, [streamingSession]);

  const toggleProjectCollapse = (name: string) => {
    setCollapsedProjects(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const currentSession = sessions?.find((s) => s.id === selectedSession);
  const displayName = selectedSession && sessionNames
    ? sessionNames[selectedSession] || selectedSession.slice(0, 8)
    : "";

  if (projectsLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-sm text-muted-foreground animate-pulse">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Left sidebar: Session tree */}
      <div
        className={cn(
          "flex flex-col border-r border-border/50 transition-all duration-300 ease-out shrink-0",
          sidebarCollapsed ? "w-14" : "w-[260px]"
        )}
        style={{ background: "var(--color-material-sidebar)", backdropFilter: "blur(20px)" }}
      >
        {/* Sidebar header */}
        <div className="flex items-center gap-2 px-3 py-3 border-b border-border/30">
          {!sidebarCollapsed && (
            <>
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setActiveSearchQuery(e.target.value);
                    setMsgSearchSeed(e.target.value);
                  }}
                  placeholder={t("sessions.searchAll")}
                  className="h-8 pl-8 pr-7 text-sm rounded-lg border-border/40"
                />
                {searchQuery && (
                  <button
                    onClick={() => { setSearchQuery(""); setActiveSearchQuery(""); }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-fast"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={handleNewSession}
                title={t("sessions.newSession")}
                className="shrink-0"
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="shrink-0 h-7 w-7 flex items-center justify-center rounded-lg hover:bg-accent/50 transition-fast text-muted-foreground hover:text-foreground"
          >
            {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        {/* Session tree */}
        <div className="flex-1 overflow-y-auto py-1">
          {!sidebarCollapsed ? (
            <>
              {projects?.map((project) => {
                if (project.session_count === 0) return null;
                const isCollapsed = collapsedProjects.has(project.encoded_name);
                const isSelected = selectedProject === project.encoded_name;

                return (
                  <div key={project.encoded_name}>
                    <button
                      onClick={() => {
                        toggleProjectCollapse(project.encoded_name);
                        if (!isCollapsed) setSelectedProject(project.encoded_name);
                      }}
                      className={cn(
                        "flex w-full items-center gap-1.5 px-3 py-1.5 text-sm transition-fast rounded-none",
                        isSelected ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {isCollapsed ? (
                        <ChevRight className="h-3.5 w-3.5 shrink-0" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5 shrink-0" />
                      )}
                      <FolderOpen className="h-3.5 w-3.5 shrink-0 opacity-60" />
                      <span className="truncate text-xs font-medium">{project.name}</span>
                      <span className="text-[10px] text-muted-foreground/60 ml-auto shrink-0">{project.session_count}</span>
                    </button>
                    {!isCollapsed && project.encoded_name === selectedProject && sessions && sessionNames && (
                      <div>
                        {sessions.map((session) => {
                          const isActive = selectedSession === session.id;
                          const name = sessionNames[session.id] || session.display_name || session.id.slice(0, 8);
                          return (
                            <button
                              key={session.id}
                              onClick={() => handleSelectSession(session.id, project.encoded_name)}
                              className={cn(
                                "flex w-full items-center gap-2 pl-8 pr-3 py-1.5 text-[13px] transition-fast",
                                isActive
                                  ? "bg-accent/80 text-accent-foreground font-medium"
                                  : "text-muted-foreground hover:bg-accent/30 hover:text-foreground"
                              )}
                            >
                              <MessageSquare className="h-3 w-3 shrink-0 opacity-50" />
                              <span className="truncate">{name}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          ) : (
            /* Collapsed: show project first letters */
            <div className="flex flex-col items-center gap-1 py-2">
              {projects?.filter(p => p.session_count > 0).map((project) => (
                <button
                  key={project.encoded_name}
                  onClick={() => {
                    setSidebarCollapsed(false);
                    setSelectedProject(project.encoded_name);
                    setCollapsedProjects(prev => {
                      const next = new Set(prev);
                      next.delete(project.encoded_name);
                      return next;
                    });
                  }}
                  className={cn(
                    "h-8 w-8 rounded-lg flex items-center justify-center text-xs font-medium transition-fast",
                    selectedProject === project.encoded_name
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-accent/30"
                  )}
                  title={project.name}
                >
                  {project.name.charAt(0).toUpperCase()}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right: Chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {!selectedSession && !streamingActive ? (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-4">
            <div className="h-16 w-16 rounded-2xl bg-accent/30 flex items-center justify-center">
              <MessageSquare className="h-8 w-8 opacity-40" />
            </div>
            <div className="text-center">
              <p className="text-sm">{t("sessions.selectSession")}</p>
              <p className="text-xs mt-1 opacity-60">{t("sessions.selectProject")}</p>
            </div>
            <Button variant="outline" size="sm" onClick={onOpenManage} className="mt-2">
              <Settings className="h-3.5 w-3.5 mr-1.5" />
              {t("nav.projects")}
            </Button>
          </div>
        ) : (
          <>
            {/* Session header */}
            {selectedSession && currentSession ? (
              <div className="flex items-center justify-between px-5 py-2.5 border-b border-border/30">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-medium text-sm truncate">{displayName}</span>
                  <span className="text-[11px] text-muted-foreground/50 font-mono">{selectedSession.slice(0, 8)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => handleResumeSession(selectedSession)}
                    disabled={loadingSessionId === selectedSession}
                    title={t("sessions.resuming")}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <FolderOpen className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon-xs" onClick={() => setRenameOpen(true)}>
                    <Pencil className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="px-5 py-2.5 border-b border-border/30">
                <span className="font-medium text-sm text-muted-foreground">{t("sessions.newChat")}</span>
              </div>
            )}
            {/* Messages */}
            <div ref={messageAreaRef} className="flex-1 min-h-0 overflow-y-auto">
              {selectedSession && (
                <MessageView messages={sessionMessages} initialSearchQuery={msgSearchSeed} onRefresh={handleRefreshMessages} flat />
              )}
              {streamingActive && (
                <StreamingMessage
                  chunks={streamChunks}
                  isComplete={streamComplete}
                  userMessage={pendingUserMessage ?? undefined}
                  scrollContainerRef={messageAreaRef}
                />
              )}
            </div>
          </>
        )}
        {/* Chat input */}
        {selectedProject && (
          <ChatInput
            sessionId={selectedSession}
            projectPath={projects?.find((p) => p.encoded_name === selectedProject)?.path ?? null}
            onMessageSent={(sid, msg) => {
              streamChunksRef.current = [];
              setStreamChunks([]);
              setStreamComplete(false);
              setStreamingSession(sid);
              setPendingUserMessage(msg);
              if (!selectedSession) {
                setSelectedSession(sid);
              }
              requestAnimationFrame(() => {
                if (messageAreaRef.current) {
                  messageAreaRef.current.scrollTop = messageAreaRef.current.scrollHeight;
                }
              });
            }}
          />
        )}
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
