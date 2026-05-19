import { cn } from "@/lib/utils";
import { MessageSquare, Clock } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { Session } from "@/types";

interface SessionListProps {
  sessions: Session[];
  sessionNames: Record<string, string>;
  selectedId: string | null;
  onSelect: (sessionId: string) => void;
}

export function SessionList({ sessions, sessionNames, selectedId, onSelect }: SessionListProps) {
  const { t } = useTranslation();
  return (
    <div className="space-y-1">
      {sessions.map((session) => {
        const displayName = sessionNames[session.id] || session.id.slice(0, 8);
        const hasCustomName = !!sessionNames[session.id];

        return (
          <button
            key={session.id}
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
            <div className="flex items-center gap-2 text-xs shrink-0 ml-2">
              <span>{t("sessions.msgCount", { count: session.messages.length })}</span>
              {session.started_at && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {new Date(session.started_at).toLocaleDateString()}
                </span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
