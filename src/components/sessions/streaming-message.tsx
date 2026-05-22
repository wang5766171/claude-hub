import { useState, useEffect } from "react";
import type { StreamChunk } from "@/types";

interface StreamingMessageProps {
  chunks: StreamChunk[];
  isComplete: boolean;
}

export function StreamingMessage({ chunks, isComplete }: StreamingMessageProps) {
  const [displayText, setDisplayText] = useState("");
  const [toolUses, setToolUses] = useState<Array<{ name: string; input: unknown }>>([]);

  useEffect(() => {
    let text = "";
    const tools: Array<{ name: string; input: unknown }> = [];

    for (const chunk of chunks) {
      if (chunk.event_type === "delta") {
        const delta = (chunk.data as Record<string, unknown>)?.event as
          | Record<string, unknown>
          | undefined;
        const deltaObj = delta?.delta as Record<string, unknown> | undefined;
        if (deltaObj?.type === "text_delta" && typeof deltaObj.text === "string") {
          text += deltaObj.text;
        }
      } else if (chunk.event_type === "message") {
        const content = (chunk.data as Record<string, unknown>)?.content as
          | Array<Record<string, unknown>>
          | undefined;
        if (content) {
          for (const block of content) {
            if (block.type === "text" && typeof block.text === "string") {
              text += block.text;
            } else if (block.type === "tool_use") {
              tools.push({ name: block.name as string, input: block.input });
            }
          }
        }
      }
    }

    setDisplayText(text);
    setToolUses(tools);
  }, [chunks]);

  if (!displayText && toolUses.length === 0) {
    return (
      <div className="px-4 py-3">
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          {!isComplete && <span className="inline-block w-1.5 h-4 bg-primary animate-pulse" />}
          <span>{isComplete ? "" : "思考中..."}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-3 space-y-2">
      <div className="text-sm whitespace-pre-wrap">
        {displayText}
        {!isComplete && <span className="inline-block w-1.5 h-4 bg-primary animate-pulse ml-0.5" />}
      </div>
      {toolUses.length > 0 && (
        <details className="text-xs text-muted-foreground">
          <summary className="cursor-pointer">
            工具调用 ({toolUses.length})
          </summary>
          {toolUses.map((tool, i) => (
            <div key={i} className="mt-1 rounded border p-2 font-mono">
              <span className="font-semibold">{tool.name}</span>
              <pre className="mt-1 whitespace-pre-wrap">{JSON.stringify(tool.input, null, 2)}</pre>
            </div>
          ))}
        </details>
      )}
    </div>
  );
}
