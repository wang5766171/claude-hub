import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { User, Bot } from "lucide-react";
import type { Message } from "@/types";

interface MessageViewProps {
  messages: Message[];
}

function formatTimestamp(ts: number | null): string {
  if (!ts) return "";
  return new Date(ts).toLocaleString();
}

export function MessageView({ messages }: MessageViewProps) {
  return (
    <ScrollArea className="h-full">
      <div className="space-y-4 p-4">
        {messages.map((msg, i) => (
          <div key={i} className={cn("flex gap-3", msg.role === "human" ? "" : "")}>
            <div className={cn(
              "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
              msg.role === "human"
                ? "bg-blue-100 text-blue-600"
                : "bg-emerald-100 text-emerald-600"
            )}>
              {msg.role === "human" ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium">
                  {msg.role === "human" ? "User" : "Assistant"}
                </span>
                {msg.timestamp && (
                  <span className="text-xs text-muted-foreground">{formatTimestamp(msg.timestamp)}</span>
                )}
              </div>
              <div className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">
                {msg.content}
              </div>
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
