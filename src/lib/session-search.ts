import type { Session, Message, ContentBlock, SessionSearchResult } from "@/types";

export function searchInContentBlock(block: ContentBlock, q: string): boolean {
  switch (block.type) {
    case "text":
      return block.text.toLowerCase().includes(q);
    case "tool_use":
      return block.name.toLowerCase().includes(q) || JSON.stringify(block.input).toLowerCase().includes(q);
    case "tool_result":
      return JSON.stringify(block.content).toLowerCase().includes(q);
    case "thinking":
      return block.thinking.toLowerCase().includes(q);
    default:
      return false;
  }
}

export function searchInMessage(message: Message, q: string): boolean {
  return message.content.some(block => searchInContentBlock(block, q));
}

function extractPreviewText(message: Message, q: string): string {
  for (const block of message.content) {
    if (block.type === "text" && searchInContentBlock(block, q)) {
      const text = block.text;
      const idx = text.toLowerCase().indexOf(q);
      if (idx !== -1) {
        const start = Math.max(0, idx - 20);
        const end = Math.min(text.length, idx + q.length + 40);
        return (start > 0 ? "..." : "") + text.slice(start, end) + (end < text.length ? "..." : "");
      }
    }
  }
  return "";
}

export function searchSessions(sessions: Session[], query: string): SessionSearchResult[] {
  if (!query.trim()) return [];
  const q = query.toLowerCase();
  const results: SessionSearchResult[] = [];

  for (const session of sessions) {
    let matchCount = 0;
    let firstMatchIndex = -1;
    let previewText = "";

    for (let i = 0; i < session.messages.length; i++) {
      if (searchInMessage(session.messages[i], q)) {
        matchCount++;
        if (firstMatchIndex === -1) {
          firstMatchIndex = i;
          previewText = extractPreviewText(session.messages[i], q);
        }
      }
    }

    if (matchCount > 0) {
      results.push({
        sessionId: session.id,
        matchCount,
        previewText: previewText.slice(0, 120),
        firstMatchIndex,
      });
    }
  }

  return results.sort((a, b) => b.matchCount - a.matchCount);
}
