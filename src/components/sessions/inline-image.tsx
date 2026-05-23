import { useState, useEffect } from "react";
import { invokeCommand } from "@/hooks/use-invoke";

export interface ImageRef {
  label: string;
  path: string;
  fullMatch: string;
}

const IMAGE_PATH_RE = /[^\s"'<>]+\.claude_hub[/\\]session_pics[/\\]\d{8}_\d{6}[/\\]\d+_[^\s"'<>]+\.(?:png|jpg|jpeg|gif|webp|bmp)/gi;

export function parseImageRefs(text: string): ImageRef[] {
  const refs: ImageRef[] = [];
  const seen = new Set<string>();
  let m: RegExpExecArray | null;
  const re = new RegExp(IMAGE_PATH_RE.source, IMAGE_PATH_RE.flags);
  while ((m = re.exec(text)) !== null) {
    const path = m[0];
    if (seen.has(path)) continue;
    seen.add(path);
    const filename = path.split(/[/\\]/).pop() || "";
    const label = filename.replace(/^\d+_/, "").replace(/\.\w+$/, "");
    refs.push({ label, path, fullMatch: m[0] });
  }
  return refs;
}

export function InlineImageDisplay({ path }: { path: string }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    invokeCommand<string>("read_image_as_data_url", { path })
      .then((url) => {
        if (!cancelled) setDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => { cancelled = true; };
  }, [path]);

  if (error) return null;
  if (!dataUrl) {
    return (
      <div className="inline-block w-16 h-16 rounded bg-muted animate-pulse" />
    );
  }

  return (
    <img
      src={dataUrl}
      className="max-h-[120px] rounded cursor-pointer hover:opacity-80 transition-opacity"
      onClick={() => window.open(dataUrl, "_blank")}
    />
  );
}

export function InlineImages({ text }: { text: string }) {
  const refs = parseImageRefs(text);
  if (refs.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2 mb-1.5">
      {refs.map((ref) => (
        <InlineImageDisplay key={ref.path} path={ref.path} />
      ))}
    </div>
  );
}

export function stripImagePrompt(text: string): string {
  let result = text
    // Strip image markers block (real newlines)
    .replace(/<!--CLAUDE_HUB_IMAGES_BEGIN-->[\s\S]*?<!--CLAUDE_HUB_IMAGES_END-->/g, "")
    // Strip image markers block (escaped \n from session file)
    .replace(/<!--CLAUDE_HUB_IMAGES_BEGIN-->.*?<!--CLAUDE_HUB_IMAGES_END-->/g, "");
  // Convert escaped \n to real newlines, then trim
  return result.replace(/\\n/g, "\n").trim();
}
