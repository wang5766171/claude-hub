import { useState, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { invokeCommand } from "@/hooks/use-invoke";
import { Button } from "@/components/ui/button";
import { Send, Square, Paperclip } from "lucide-react";
import { ImagePreview } from "./image-preview";
import { listen } from "@tauri-apps/api/event";
import type { SavedImage, StreamChunk } from "@/types";

interface AttachedImage {
  id: string;
  data: string;
  filename: string;
  label: string;
}

interface ChatInputProps {
  sessionId: string | null;
  projectPath: string | null;
  disabled?: boolean;
  onMessageSent?: (chatSessionId: string) => void;
  onStreamChunk?: (chunk: StreamChunk) => void;
  onStreamComplete?: () => void;
}

export function ChatInput({
  sessionId,
  projectPath,
  disabled = false,
  onMessageSent,
  onStreamChunk,
  onStreamComplete,
}: ChatInputProps) {
  const { t } = useTranslation();
  const [message, setMessage] = useState("");
  const [images, setImages] = useState<AttachedImage[]>([]);
  const [sending, setSending] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const placeholder =
    images.length === 0
      ? t("sessions.chatPlaceholder")
      : images.length === 1
        ? t("sessions.chatPlaceholderSingleImage")
        : t("sessions.chatPlaceholderMultiImage");

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const items = e.clipboardData.items;
      const newImages: AttachedImage[] = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (!file) continue;
          const reader = new FileReader();
          reader.onload = () => {
            const base64 = (reader.result as string).split(",")[1];
            const idx = images.length + newImages.length + 1;
            setImages((prev) => [
              ...prev,
              {
                id: `paste-${Date.now()}-${i}`,
                data: base64,
                filename: file.name || `pasted-image-${idx}.png`,
                label: t("projects.imageLabel", { index: idx }),
              },
            ]);
          };
          reader.readAsDataURL(file);
        }
      }
    },
    [images.length]
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach((file, i) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(",")[1];
        const idx = images.length + i + 1;
        setImages((prev) => [
          ...prev,
          {
            id: `file-${Date.now()}-${i}`,
            data: base64,
            filename: file.name,
            label: `图片${idx}`,
          },
        ]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  };

  const handleLabelChange = (id: string, label: string) => {
    setImages((prev) => prev.map((img) => (img.id === id ? { ...img, label } : img)));
  };

  const handleRemoveImage = (id: string) => {
    setImages((prev) => prev.filter((img) => img.id !== id));
  };

  const handleSend = async () => {
    if (!projectPath || sending) return;
    if (!message.trim() && images.length === 0) return;

    setSending(true);
    try {
      let savedImagePaths: string[] | undefined;

      if (images.length > 0) {
        const inputImages = images.map((img) => ({
          data: img.data,
          filename: img.filename,
          label: img.label || null,
        }));
        const saved = await invokeCommand<SavedImage[]>("save_session_images", {
          projectPath,
          images: inputImages,
        });
        savedImagePaths = saved.map((s) => s.path);
      }

      const finalMessage = message.trim() || t("projects.defaultImageMessage");

      const chatSession = await invokeCommand<{ session_id: string; process_id: number }>(
        "send_message",
        {
          projectPath,
          sessionId: sessionId,
          message: finalMessage,
          imagePaths: savedImagePaths,
        }
      );

      setActiveSessionId(chatSession.session_id);
      if (onMessageSent) onMessageSent(chatSession.session_id);

      // Stream events are handled by the parent via listen("chat-stream")
      // We just listen for the result event to clear our own sending state
      const unlisten = await listen<StreamChunk>("chat-stream", (event) => {
        if (event.payload.session_id === chatSession.session_id) {
          if (onStreamChunk) onStreamChunk(event.payload);
          if (event.payload.event_type === "result") {
            setSending(false);
            setActiveSessionId(null);
            if (onStreamComplete) onStreamComplete();
            unlisten();
          }
        }
      });

      setMessage("");
      setImages([]);
    } catch (err) {
      console.error("Failed to send message:", err);
      setSending(false);
    }
  };

  const handleAbort = async () => {
    if (activeSessionId) {
      await invokeCommand("abort_chat", { sessionId: activeSessionId });
      setSending(false);
      setActiveSessionId(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t border-border">
      <ImagePreview images={images} onLabelChange={handleLabelChange} onRemove={handleRemoveImage} />
      <div className="flex items-end gap-2 p-3">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFileSelect}
        />
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || sending}
          title={t("sessions.attachImage")}
        >
          <Paperclip className="h-4 w-4" />
        </Button>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          className="flex-1 resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring min-h-[36px] max-h-[120px]"
          style={{ height: "auto", overflow: "hidden" }}
          onInput={(e) => {
            const target = e.target as HTMLTextAreaElement;
            target.style.height = "auto";
            target.style.height = Math.min(target.scrollHeight, 120) + "px";
          }}
        />
        {sending ? (
          <Button variant="destructive" size="icon-xs" onClick={handleAbort}>
            <Square className="h-3.5 w-3.5" />
          </Button>
        ) : (
          <Button
            size="icon-xs"
            onClick={handleSend}
            disabled={disabled || (!message.trim() && images.length === 0)}
          >
            <Send className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}
