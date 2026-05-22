import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import type { StreamChunk } from "@/types";

interface StreamingMessageProps {
  chunks: StreamChunk[];
  isComplete: boolean;
  userMessage?: string;
  scrollContainerRef?: React.RefObject<HTMLDivElement | null>;
}

export function StreamingMessage({ chunks, isComplete, userMessage, scrollContainerRef }: StreamingMessageProps) {
  const { t } = useTranslation();
  const [displayText, setDisplayText] = useState("");
  const [toolUses, setToolUses] = useState<Array<{ name: string; input: unknown }>>([]);
  const textRef = useRef("");
  const toolsRef = useRef<Array<{ name: string; input: unknown }>>([]);
  const rafRef = useRef<number>(0);
  const processedCount = useRef(0);

  const scrollToBottom = useCallback(() => {
    if (scrollContainerRef?.current) {
      const el = scrollContainerRef.current;
      el.scrollTop = el.scrollHeight;
    }
  }, [scrollContainerRef]);

  // Batch text updates via ref + rAF for smooth streaming
  useEffect(() => {
    const newChunks = chunks.slice(processedCount.current);
    if (newChunks.length === 0) return;

    for (const chunk of newChunks) {
      if (chunk.event_type === "delta") {
        const delta = (chunk.data as Record<string, unknown>)?.event as Record<string, unknown> | undefined;
        const deltaObj = delta?.delta as Record<string, unknown> | undefined;
        if (deltaObj?.type === "text_delta" && typeof deltaObj.text === "string") {
          textRef.current += deltaObj.text;
        }
      } else if (chunk.event_type === "message") {
        const content = (chunk.data as Record<string, unknown>)?.content as Array<Record<string, unknown>> | undefined;
        if (content) {
          for (const block of content) {
            if (block.type === "text" && typeof block.text === "string") {
              textRef.current += block.text;
            } else if (block.type === "tool_use") {
              toolsRef.current.push({ name: block.name as string, input: block.input });
            }
          }
        }
      }
    }
    processedCount.current = chunks.length;

    // Cancel previous rAF and schedule new one
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      setDisplayText(textRef.current);
      setToolUses([...toolsRef.current]);
      scrollToBottom();
    });

    return () => cancelAnimationFrame(rafRef.current);
  }, [chunks, scrollToBottom]);

  // Reset on unmount/new stream
  useEffect(() => {
    textRef.current = "";
    toolsRef.current = [];
    processedCount.current = 0;
    setDisplayText("");
    setToolUses([]);
  }, []);

  // Auto-scroll periodically during streaming
  useEffect(() => {
    if (isComplete) return;
    const interval = setInterval(scrollToBottom, 200);
    return () => clearInterval(interval);
  }, [isComplete, scrollToBottom]);

  return (
    <div className="px-4 py-3">
      {/* User message */}
      {userMessage && (
        <div className="flex justify-end mb-3">
          <div className="rounded-lg bg-primary text-primary-foreground px-3 py-2 text-sm max-w-[80%] whitespace-pre-wrap">
            {userMessage}
          </div>
        </div>
      )}

      {/* Assistant streaming response */}
      {!displayText && toolUses.length === 0 && !isComplete ? (
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <span className="inline-block w-1.5 h-4 bg-primary animate-pulse" />
          <span>{t("sessions.thinkingDots")}</span>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="text-sm whitespace-pre-wrap">
            {displayText}
            {!isComplete && <span className="inline-block w-1.5 h-4 bg-primary animate-pulse ml-0.5" />}
          </div>
          {toolUses.length > 0 && (
            <details className="text-xs text-muted-foreground" open>
              <summary className="cursor-pointer">
                {t("sessions.toolCalls", { count: toolUses.length })}
              </summary>
              {toolUses.map((tool, i) => (
                <div key={i} className="mt-1 rounded border p-2 font-mono">
                  <span className="font-semibold">{tool.name}</span>
                  <pre className="mt-1 whitespace-pre-wrap overflow-x-auto">{JSON.stringify(tool.input, null, 2)}</pre>
                </div>
              ))}
            </details>
          )}
        </div>
      )}
    </div>
  );
}
