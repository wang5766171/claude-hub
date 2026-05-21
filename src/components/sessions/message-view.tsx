import { useState, useMemo, useRef, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { User, Bot, Wrench, ChevronDown, ChevronUp, ChevronRight, Search, ArrowDown, RotateCw, Copy, Check } from "lucide-react";
import type { Message, ContentBlock } from "@/types";

interface MessageViewProps {
  messages: Message[];
  initialSearchQuery?: string;
  onRefresh?: () => void;
}

function formatTimestamp(ts: number | null): string {
  if (!ts) return "";
  return new Date(ts).toLocaleString();
}

function highlightText(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${escaped})`, "gi"));
  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase()
      ? <mark key={i} className="bg-yellow-200 rounded px-0.5">{part}</mark>
      : part
  );
}

function ToolUseBlock({ block, query, dark }: { block: ContentBlock & { type: "tool_use" }; query: string; dark?: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const inputStr = JSON.stringify(block.input, null, 2);

  return (
    <Collapsible open={expanded} onOpenChange={setExpanded} className="overflow-hidden">
      <div className={cn(
        "rounded-md border text-sm",
        dark ? "border-blue-300/50 bg-blue-400/30" : "border-blue-200 bg-blue-50"
      )}>
        <CollapsibleTrigger asChild>
          <button
            className={cn(
              "flex items-center gap-2 w-full px-3 py-1.5 text-left transition-colors min-w-0",
              dark ? "text-blue-100 hover:bg-blue-400/40" : "text-blue-700 hover:bg-blue-100"
            )}
          >
            {expanded ? <ChevronDown className="h-3 w-3 shrink-0" /> : <ChevronRight className="h-3 w-3 shrink-0" />}
            <Wrench className="h-3 w-3 shrink-0" />
            <span className="font-mono font-medium truncate">[{block.name}]</span>
          </button>
        </CollapsibleTrigger>
        {expanded && (
          <pre className={cn(
            "px-3 py-2 border-t text-xs font-mono whitespace-pre-wrap break-all max-h-64 overflow-auto",
            dark
              ? "border-blue-300/30 text-blue-100 bg-black/10"
              : "border-blue-200 text-blue-800 bg-blue-50/50"
          )}>
            {query ? highlightText(inputStr, query) : inputStr}
          </pre>
        )}
      </div>
    </Collapsible>
  );
}

function ToolResultBlock({ block, query, dark }: { block: ContentBlock & { type: "tool_result" }; query: string; dark?: boolean }) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const contentStr = typeof block.content === "string"
    ? block.content
    : JSON.stringify(block.content, null, 2);
  const truncated = contentStr.length > 500;
  const displayText = expanded ? contentStr : contentStr.slice(0, 500);

  return (
    <Collapsible open={expanded} onOpenChange={setExpanded} className="overflow-hidden">
      <div className={cn(
        "rounded-md border text-sm",
        dark ? "border-amber-300/50 bg-amber-400/30" : "border-amber-200 bg-amber-50"
      )}>
        <CollapsibleTrigger asChild>
          <div
            className={cn(
              "flex items-center gap-1 px-3 py-1.5 text-xs font-medium cursor-pointer select-none",
              dark ? "text-amber-100 hover:bg-amber-400/40" : "text-amber-700 hover:bg-amber-100"
            )}
          >
            {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            [Result]
          </div>
        </CollapsibleTrigger>
        <pre className={cn(
          "px-3 py-2 text-xs font-mono whitespace-pre-wrap break-all max-h-64 overflow-auto",
          dark ? "text-amber-100" : "text-amber-800"
        )}>
          {query ? highlightText(displayText, query) : displayText}
        </pre>
        {truncated && !expanded && (
          <button
            onClick={() => setExpanded(true)}
            className={cn(
              "px-3 py-1 text-xs",
              dark ? "text-amber-200 hover:text-amber-100" : "text-amber-600 hover:text-amber-800"
            )}
          >
            {t("sessions.showMore")}
          </button>
        )}
      </div>
    </Collapsible>
  );
}

function ThinkingBlock({ block }: { block: ContentBlock & { type: "thinking" } }) {
  const { t } = useTranslation();

  return (
    <details className="text-sm">
      <summary className="cursor-pointer text-muted-foreground hover:text-foreground text-xs select-none">
        {t("sessions.showThinking")}
      </summary>
      <pre className="mt-1 rounded-md bg-muted p-3 text-xs font-mono whitespace-pre-wrap break-all text-muted-foreground max-h-64 overflow-auto">
        {block.thinking}
      </pre>
    </details>
  );
}

function TextBlock({ text, query, dark }: { text: string; query: string; dark?: boolean }) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const needsCollapse = text.length > 200;

  if (!needsCollapse) {
    return (
      <div className="whitespace-pre-wrap break-all text-sm overflow-hidden">
        {query ? highlightText(text, query) : text}
      </div>
    );
  }

  return (
    <Collapsible open={expanded} onOpenChange={setExpanded} className="overflow-hidden">
      <div className="relative">
        <div className={cn("whitespace-pre-wrap break-all text-sm overflow-hidden", !expanded && "max-h-24")}>
          {query ? highlightText(text, query) : text}
        </div>
        {!expanded && (
          <div className={cn(
            "absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t to-transparent",
            dark ? "from-blue-500/90" : "from-muted/90"
          )} />
        )}
      </div>
      <CollapsibleTrigger asChild>
        <button
          className={cn(
            "mt-1 inline-flex items-center gap-1 rounded-full px-3 py-0.5 text-xs transition-colors",
            dark
              ? "text-blue-100/90 hover:text-blue-100 hover:bg-white/10"
              : "text-foreground/60 hover:text-foreground hover:bg-muted"
          )}
        >
          {expanded ? (
            <ChevronUp className="h-3 w-3" />
          ) : (
            <ChevronDown className="h-3 w-3" />
          )}
          {expanded ? t("sessions.collapse") : t("sessions.expand")}
        </button>
      </CollapsibleTrigger>
    </Collapsible>
  );
}

function extractMessageText(msg: Message): string {
  return msg.content.map(block => {
    switch (block.type) {
      case "text": return block.text;
      case "tool_use": return `[${block.name}]\n${JSON.stringify(block.input, null, 2)}`;
      case "tool_result": return typeof block.content === "string" ? block.content : JSON.stringify(block.content, null, 2);
      case "thinking": return block.thinking;
      default: return "";
    }
  }).filter(Boolean).join("\n\n");
}

function CopyButton({ text }: { text: string }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
      title={t("sessions.copy")}
    >
      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      {copied ? t("sessions.copied") : t("sessions.copy")}
    </button>
  );
}

function renderBlock(block: ContentBlock, query: string, dark?: boolean): React.ReactNode {
  switch (block.type) {
    case "text":
      return <TextBlock text={block.text} query={query} dark={dark} />;
    case "tool_use":
      return <ToolUseBlock block={block} query={query} dark={dark} />;
    case "tool_result":
      return <ToolResultBlock block={block} query={query} dark={dark} />;
    case "thinking":
      return <ThinkingBlock block={block} />;
    default:
      return null;
  }
}

export function MessageView({ messages, initialSearchQuery, onRefresh }: MessageViewProps) {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery || "");
  const [currentIndex, setCurrentIndex] = useState(0);
  const matchRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  useEffect(() => {
    if (initialSearchQuery) setSearchQuery(initialSearchQuery);
  }, [initialSearchQuery]);

  const matchIndices = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return messages.reduce<number[]>((acc, msg, i) => {
      const hasMatch = msg.content.some(block => {
        if (block.type === "text") return block.text.toLowerCase().includes(q);
        if (block.type === "tool_use") return block.name.toLowerCase().includes(q) || JSON.stringify(block.input).toLowerCase().includes(q);
        if (block.type === "tool_result") return JSON.stringify(block.content).toLowerCase().includes(q);
        if (block.type === "thinking") return block.thinking.toLowerCase().includes(q);
        return false;
      });
      if (hasMatch) acc.push(i);
      return acc;
    }, []);
  }, [messages, searchQuery]);

  useEffect(() => {
    setCurrentIndex(0);
  }, [searchQuery]);

  useEffect(() => {
    if (matchIndices.length > 0) {
      const el = matchRefs.current.get(currentIndex);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [currentIndex, matchIndices]);

  const isHighlighted = (i: number) => matchIndices.includes(i);
  const isCurrent = (i: number) => matchIndices[currentIndex] === i;

  return (
    <div className="flex h-full flex-col">
      {/* Search bar */}
      <div className="border-b border-border px-4 py-2 flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("sessions.search")}
            className="h-8 pl-8 text-sm"
          />
        </div>
        {matchIndices.length > 0 && (
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {currentIndex + 1}/{matchIndices.length}
            </span>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => setCurrentIndex((currentIndex + 1) % matchIndices.length)}
            >
              <ArrowDown className="h-3 w-3" />
            </Button>
          </div>
        )}
        {searchQuery && matchIndices.length === 0 && (
          <span className="text-xs text-muted-foreground">{t("sessions.noResults")}</span>
        )}
        {onRefresh && (
          <Button variant="ghost" size="icon-xs" onClick={onRefresh}>
            <RotateCw className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 min-h-0 message-scroll">
        <div className="space-y-4 p-4 overflow-hidden max-w-full">
          {messages.map((msg, i) => {
            const isUser = msg.role === "user";
            return (
              <div
                key={i}
                ref={(el) => { if (el && isHighlighted(i)) matchRefs.current.set(i, el); }}
                className={cn(
                  "flex gap-2.5 w-full",
                  isUser ? "justify-end" : "justify-start",
                  isCurrent(i) && "ring-2 ring-yellow-300 rounded-lg px-1 py-0.5",
                  isHighlighted(i) && !isCurrent(i) && "bg-yellow-50/30 rounded-lg px-1 py-0.5",
                )}
              >
                {/* Avatar (left for assistant) */}
                {!isUser && (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mt-5">
                    <Bot className="h-3.5 w-3.5" />
                  </div>
                )}

                {/* Bubble */}
                <div className={cn("max-w-[85%] min-w-0 flex flex-col", isUser && "items-end")}>
                  <div className="flex items-center gap-2 mb-1 text-xs">
                    <span className="font-medium text-muted-foreground">
                      {isUser ? t("sessions.user") : t("sessions.assistant")}
                    </span>
                    {msg.timestamp && (
                      <span className="text-muted-foreground">{formatTimestamp(msg.timestamp)}</span>
                    )}
                  </div>
                  <div className={cn(
                    "rounded-xl px-3.5 py-2.5 space-y-2 overflow-hidden min-w-0 max-w-full",
                    isUser ? "bg-blue-500 text-white" : "bg-muted"
                  )}>
                    {msg.content.map((block, j) => (
                      <div key={j} className="overflow-hidden">
                        {renderBlock(block, searchQuery, isUser)}
                      </div>
                    ))}
                  </div>
                  <CopyButton text={extractMessageText(msg)} />
                </div>

                {/* Avatar (right for user) */}
                {isUser && (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600 mt-5">
                    <User className="h-3.5 w-3.5" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
