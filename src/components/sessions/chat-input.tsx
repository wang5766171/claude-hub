import { useState, useRef, useCallback, forwardRef, useImperativeHandle } from "react";
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
  onMessageSent?: (chatSessionId: string, userMessage: string) => void;
}

export const ChatInput = forwardRef<HTMLTextAreaElement, ChatInputProps>(function ChatInput({
  sessionId,
  projectPath,
  disabled = false,
  onMessageSent,
}: ChatInputProps, ref) {
  const { t } = useTranslation();
  const [message, setMessage] = useState("");
  const [images, setImages] = useState<AttachedImage[]>([]);
  const [sending, setSending] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useImperativeHandle(ref, () => textareaRef.current!, []);

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
      let fullMessage = message.trim();

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
        const batchId = saved[0]?.batch_id ?? "unknown";
        const imageLines = saved
          .map((s) => `${s.label}（批次 ${s.batch_id}）: ${s.path}`)
          .join("\n");
        if (!fullMessage) {
          fullMessage = t("projects.defaultImageMessage");
        }
        fullMessage += `\n\n<!--CLAUDE_HUB_IMAGES_BEGIN-->\n[用户在本次对话中上传了以下图片（批次 ${batchId}），请使用 Read 工具查看对应的文件路径：]\n${imageLines}\n<!--CLAUDE_HUB_IMAGES_END-->`;
      }

      const chatSession = await invokeCommand<{ session_id: string; process_id: number }>(
        "send_message",
        {
          projectPath,
          sessionId: sessionId,
          message: fullMessage,
        }
      );

      setActiveSessionId(chatSession.session_id);
      if (onMessageSent) onMessageSent(chatSession.session_id, fullMessage);

      // Listen for result to clear our own sending state
      // Stream display is handled by sessions-page's global listener
      const unlisten = await listen<StreamChunk>("chat-stream", (event) => {
        if (event.payload.session_id === chatSession.session_id && event.payload.event_type === "result") {
          setSending(false);
          setActiveSessionId(null);
          unlisten();
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
    <div className="px-4 pb-4 pt-2">
      <div className="relative flex flex-col rounded-2xl border border-input bg-card shadow-sm focus-within:ring-1 focus-within:ring-ring focus-within:border-ring transition-shadow">
        <ImagePreview images={images} onLabelChange={handleLabelChange} onRemove={handleRemoveImage} />
        
        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          className="w-full resize-none bg-transparent px-4 py-3 text-sm focus:outline-none min-h-[52px] max-h-[200px]"
          style={{ height: "auto", overflow: "hidden" }}
          onInput={(e) => {
            const target = e.target as HTMLTextAreaElement;
            target.style.height = "auto";
            target.style.height = Math.min(target.scrollHeight, 200) + "px";
          }}
        />

        <div className="flex items-center justify-between px-3 pb-3 pt-1">
          {/* Left Side: Tools/Attachments */}
          <div className="flex items-center gap-1">
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
              size="icon-sm"
              className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || sending}
              title={t("sessions.attachImage")}
            >
              <Paperclip className="h-4 w-4" />
            </Button>
          </div>

          {/* Right Side: Send/Abort */}
          <div className="flex items-center gap-1">
            {sending ? (
              <Button variant="destructive" size="icon-sm" className="h-8 w-8 rounded-full" onClick={handleAbort}>
                <Square className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                variant={(message.trim() || images.length > 0) ? "default" : "secondary"}
                size="icon-sm"
                className={`h-8 w-8 rounded-full transition-all ${
                  (message.trim() || images.length > 0) 
                    ? "bg-[var(--icon-send-bg)] text-[var(--icon-send-fg)] shadow-sm hover:opacity-90" 
                    : "text-muted-foreground opacity-50"
                }`}
                style={(message.trim() || images.length > 0) ? { backgroundColor: 'var(--icon-send-bg)', color: 'var(--icon-send-fg)' } : undefined}
                onClick={handleSend}
                disabled={disabled || (!message.trim() && images.length === 0)}
              >
                <Send className="h-4 w-4 ml-[2px]" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});
