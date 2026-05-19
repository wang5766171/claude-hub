export interface Project {
  name: string;
  path: string;
  encoded_name: string;
  session_count: number;
  last_active: string | null;
  has_claude_md: boolean;
}

export interface Message {
  role: string;
  content: string;
  timestamp: number | null;
}

export interface Session {
  id: string;
  path: string;
  messages: Message[];
  started_at: string | null;
}

export interface HistoryEntry {
  display: string;
  timestamp: number | null;
  project: string | null;
  sessionId: string | null;
}

export interface ClaudeConfig {
  model: string | null;
  env: Record<string, string> | null;
  enabledPlugins: Record<string, boolean> | null;
  skipDangerousModePermissionPrompt: boolean | null;
}

export interface Preset {
  id: string;
  name: string;
  config: ClaudeConfig;
  createdAt: string;
}

export interface BackupEntry {
  name: string;
  path: string;
  timestamp: string | null;
}

export type Page = "projects" | "sessions" | "config" | "commands";
