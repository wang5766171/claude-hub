import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { MessageSquare, Clock } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { Session, SessionSearchResult } from "@/types";

interface SessionListProps {
  sessions: Session[];
  sessionNames: Record<string, string>;
  selectedId: string | null;
  onSelect: (sessionId: string) => void;
  searchQuery?: string;
  searchResults?: SessionSearchResult[];
}

export function SessionList({ sessions, sessionNames, selectedId, onSelect, searchQuery, searchResults }: SessionListProps) {
  const { t } = useTranslation();

  const filteredSessions = useMemo(() => {
    if (!searchQuery || !searchResults) return sessions;
    const ids = new Set(searchResults.map(r => r.sessionId));
    return sessions.filter(s => ids.has(s.id));
  }, [sessions, searchQuery, searchResults]);

  const resultMap = useMemo(() => {
    if (!searchResults) return new Map<string, SessionSearchResult>();
    return new Map(searchResults.map(r => [r.sessionId, r]));
  }, [searchResults]);

  return (
    <div className="space-y-1">
      {filteredSessions.map((session) => {
        const displayName = sessionNames[session.id] || session.display_name || session.id.slice(0, 8);
        const hasCustomName = !!sessionNames[session.id];
        const result = resultMap.get(session.id);

        return (
          <div key={session.id}>
            <button
              onClick={() => onSelect(session.id)}
              className={cn(
                "flex w-full items-center justify-between rounded-md px-3 py-2 text-sm transition-colors",
                selectedId === session.id
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent/50"
              )}
            >
              <div className="flex items-center gap-2 min-w-0">
                <MessageSquare className="h-3.5 w-3.5 shrink-0" />
                <div className="truncate">
                  <span className={cn(hasCustomName && "font-medium")}>{displayName}</span>
                  {hasCustomName && (
                    <span className="ml-2 text-xs text-muted-foreground">{session.id.slice(0, 8)}</span>
                  )}
                </div>
              </div>
              {result ? (
                <span className="text-xs text-blue-600 font-medium shrink-0 ml-2">
                  {result.matchCount} {t("sessions.matches")}
                </span>
              ) : (
                <div className="flex items-center gap-2 text-xs shrink-0 ml-2">
                  <span>{t("sessions.msgCount", { count: session.messages.length })}</span>
                  {session.started_at && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(session.started_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
              )}
            </button>
            {result && result.previewText && (
              <div className="text-xs text-muted-foreground truncate px-3 pb-1.5 pl-9">
                {result.previewText}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
