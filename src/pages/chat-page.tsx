import { useState, useEffect, useLayoutEffect, useRef, useCallback } from "react";
import { useInvoke, invokeCommand } from "@/hooks/use-invoke";
import { MessageView } from "@/components/sessions/message-view";
import { RenameSessionDialog } from "@/components/sessions/rename-session-dialog";
import { ChatInput } from "@/components/sessions/chat-input";
import { StreamingMessage } from "@/components/sessions/streaming-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  MessageSquare, Search, X, Pencil,
  ChevronDown, ChevronRight as ChevRight, FolderOpen, SquarePen, PanelLeftClose, PanelLeftOpen,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { listen } from "@tauri-apps/api/event";
import { cn } from "@/lib/utils";
import type { Session, Project, Message, ContentBlock, StreamChunk } from "@/types";

function TerminalIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="2" y="3" width="20" height="18" rx="3" />
      <polyline points="7 10 10 13 7 16" />
      <line x1="13" y1="16" x2="17" y2="16" />
    </svg>
  );
}

function formatRelativeTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "刚刚";
  if (diffMin < 60) return `${diffMin}分钟前`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}小时前`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}天前`;
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${mm}-${dd} ${hh}:${mi}`;
}

function ProjectSessionGroup({
  project,
  isCollapsed,
  selectedSessionId,
  sessionNames,
  onSelectSession,
}: {
  project: Project;
  isCollapsed: boolean;
  selectedSessionId: string | null;
  sessionNames: Record<string, string> | null | undefined;
  onSelectSession: (sessionId: string, projectName: string) => void;
}) {
  const { data: sessions } = useInvoke<Session[]>(
    "list_sessions",
    { encodedName: project.encoded_name }
  );

  if (!sessions || !sessionNames) return null;

  return (
    <div className={isCollapsed ? "hidden" : ""}>
      {sessions.map((session) => {
        const isActive = selectedSessionId === session.id;
        const name = sessionNames[session.id] || session.display_name || session.id.slice(0, 8);
        const timeStr = session.last_active
          ? formatRelativeTime(session.last_active)
          : session.started_at
            ? formatRelativeTime(session.started_at)
            : null;
        return (
          <button
            key={session.id}
            onClick={() => onSelectSession(session.id, project.encoded_name)}
            className={cn(
              "flex w-full items-center gap-2 pl-8 pr-2 py-1.5 text-[12px] transition-fast",
              isActive
                ? "bg-primary/10 text-foreground font-medium"
                : "text-muted-foreground hover:bg-accent/30 hover:text-foreground"
            )}
          >
            <MessageSquare className="h-3 w-3 shrink-0 text-[var(--icon-message)]" />
            <span className="truncate flex-1 text-left min-w-0">{name}</span>
            {timeStr && (
              <span className={cn(
                "text-[10px] shrink-0 tabular-nums",
                isActive ? "text-accent-foreground/40" : "text-muted-foreground/40"
              )}>{timeStr}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function ChatPage({ onOpenManage: _onOpenManage }: { onOpenManage: () => void }) {
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
  const [viewingProject, setViewingProject] = useState<string | null>(null);
  const messageAreaRef = useRef<HTMLDivElement>(null);
  const streamChunksRef = useRef<StreamChunk[]>([]);
  const visitedSessions = useRef(new Set<string>());
  const scrollMemory = useRef(new Map<string, number>());
  const scrollAction = useRef<{ type: "bottom" } | { type: "restore"; top: number } | null>(null);
  const streamingActive = streamingSession || streamComplete;

  // Default: collapse all projects
  useEffect(() => {
    if (projects && projects.length > 0 && collapsedProjects.size === 0) {
      setCollapsedProjects(new Set(projects.filter(p => p.session_count > 0).map(p => p.encoded_name)));
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

  const handleSelectSession = async (sessionId: string, projectName?: string) => {
    const targetProject = projectName || selectedProject;
    if (!targetProject) return;

    if (selectedSession && messageAreaRef.current) {
      scrollMemory.current.set(selectedSession, messageAreaRef.current.scrollTop);
    }
    const isFirstVisit = !visitedSessions.current.has(sessionId);
    setSelectedSession(sessionId);
    setSelectedProject(targetProject);
    setViewingProject(targetProject);
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
      const session = viewingSessions?.find(s => s.id === sessionId);
      const project = projects?.find((p) => p.encoded_name === viewingProject);
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

  const handleRefreshMessages = useCallback(async () => {
    if (selectedSession && viewingProject) {
      try {
        const msgs = await invokeCommand<Message[]>("get_session_messages", {
          sessionId: selectedSession,
          encodedName: viewingProject,
        });
        setSessionMessages(msgs);
      } catch (e) {
        console.error(e);
      }
    }
  }, [selectedSession, viewingProject]);

  const handleMessageSent = useCallback((sid: string, msg: string) => {
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
  }, [selectedSession]);

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

          setTimeout(() => { refetchNames(); }, 2000);
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

  // For the right panel, track sessions of the project being viewed (not the sidebar-selected one)
  const { data: viewingSessions } = useInvoke<Session[]>(
    viewingProject ? "list_sessions" : "",
    viewingProject ? { encodedName: viewingProject } : undefined
  );
  const currentSession = viewingSessions?.find((s) => s.id === selectedSession);
  const displayName = selectedSession
    ? (sessionNames?.[selectedSession] || currentSession?.display_name || selectedSession.slice(0, 8))
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
          "flex flex-col shrink-0",
          sidebarCollapsed ? "w-14" : "w-[240px]"
        )}
        style={{
          background: "var(--color-layer-2)",
          borderRight: "1px solid var(--color-border)",
          boxShadow: "1px 0 0 0 var(--color-border), 4px 0 8px -2px rgba(0, 0, 0, 0.06)",
          position: "relative",
          zIndex: 11,
        }}
      >
        {/* Sidebar header: expanded */}
        <div className={cn("flex flex-col", sidebarCollapsed && "hidden")} style={{ background: "var(--color-layer-1)" }}>
          <div className="flex items-center gap-2 px-3 pt-2 pb-1">
            <button
              onClick={handleNewSession}
              title={t("sessions.newSession")}
              className="flex-1 flex items-center gap-2 h-8 px-2.5 rounded-lg hover:bg-accent transition-fast text-sm"
            >
              <SquarePen className="h-3.5 w-3.5 shrink-0 text-[var(--icon-action)]" />
              <span className="truncate">发起新对话</span>
            </button>
            <button
              onClick={() => setSidebarCollapsed(true)}
              className="shrink-0 h-7 w-7 flex items-center justify-center rounded-lg hover:bg-accent/50 transition-fast text-muted-foreground hover:text-foreground"
            >
              <PanelLeftClose className="h-4 w-4" />
            </button>
          </div>
          <div className="px-3 pb-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--icon-search)]" />
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
          </div>
        </div>

        {/* Sidebar header: collapsed */}
        <div className={cn("flex flex-col", !sidebarCollapsed && "hidden")} style={{ background: "var(--color-layer-1)" }}>
          <div className="flex items-center justify-center px-3 pt-2 pb-1">
            <button
              onClick={() => setSidebarCollapsed(false)}
              className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-accent/50 transition-fast text-muted-foreground hover:text-foreground"
            >
              <PanelLeftOpen className="h-4 w-4" />
            </button>
          </div>
          <div className="flex items-center justify-center px-3 pb-2">
            <button
              onClick={handleNewSession}
              title={t("sessions.newSession")}
              className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-accent transition-fast"
            >
              <SquarePen className="h-4 w-4 text-[var(--icon-action)]" />
            </button>
          </div>
        </div>

        {/* Session tree: expanded */}
        <div className={cn("flex-1 overflow-y-auto", sidebarCollapsed && "hidden")}>
          {projects?.map((project) => {
            if (project.session_count === 0) return null;
            const isCollapsed = collapsedProjects.has(project.encoded_name);
            return (
              <div key={project.encoded_name}>
                <button
                  onClick={() => {
                    toggleProjectCollapse(project.encoded_name);
                  }}
                  className={cn(
                    "flex w-full items-center gap-1.5 px-3 py-1.5 transition-fast rounded-none",
                    "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {isCollapsed ? (
                    <ChevRight className="h-3.5 w-3.5 shrink-0" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5 shrink-0" />
                  )}
                  <FolderOpen className="h-3.5 w-3.5 shrink-0 text-[var(--icon-folder)]" />
                  <span className="truncate text-[13px] font-medium">{project.name}</span>
                  <span className="text-[10px] text-muted-foreground/60 ml-auto shrink-0">{project.session_count}</span>
                </button>
                <ProjectSessionGroup
                  project={project}
                  isCollapsed={isCollapsed}
                  selectedSessionId={selectedSession}
                  sessionNames={sessionNames}
                  onSelectSession={handleSelectSession}
                />
              </div>
            );
          })}
        </div>

        {/* Collapsed: empty body area */}
        <div className={cn("flex-1", !sidebarCollapsed && "hidden")} />
      </div>

      {/* Right: Chat area */}
      <div className="flex-1 flex flex-col min-w-0 bg-background">
        {!selectedSession && !streamingActive ? (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3">
            <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center">
              <MessageSquare className="h-7 w-7 text-[var(--icon-message)]" />
            </div>
            <p className="text-sm">{t("sessions.selectSession")}</p>
          </div>
        ) : (
          <>
            {/* Session header */}
            {selectedSession && currentSession ? (
              <div className="flex items-center justify-between px-5 h-[44px] border-b border-border/30" style={{ background: "var(--color-layer-1)" }}>
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-medium text-sm truncate">{displayName}</span>
                  <span className="text-[11px] text-muted-foreground/50 font-mono shrink-0">{selectedSession.slice(0, 8)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => handleResumeSession(selectedSession)}
                    disabled={loadingSessionId === selectedSession}
                    title={t("sessions.openTerminal")}
                  >
                    <TerminalIcon className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon-xs" onClick={() => setRenameOpen(true)} title={t("sessions.rename")}>
                    <Pencil className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="px-5 h-[44px] flex items-center border-b border-border/30" style={{ background: "var(--color-layer-1)" }}>
                <span className="font-medium text-sm text-muted-foreground">{t("sessions.newChat")}</span>
              </div>
            )}
            {/* Messages */}
            <div ref={messageAreaRef} className="flex-1 min-h-0 overflow-y-auto">
              {selectedSession && (
                <MessageView messages={sessionMessages} initialSearchQuery={msgSearchSeed} onRefresh={handleRefreshMessages} flat scrollContainerRef={messageAreaRef} />
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
        {viewingProject && (
          <ChatInput
            sessionId={selectedSession}
            projectPath={projects?.find((p) => p.encoded_name === viewingProject)?.path ?? null}
            onMessageSent={handleMessageSent}
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
