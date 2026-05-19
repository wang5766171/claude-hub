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
  session_id: string | null;
}

export interface ClaudeConfig {
  model: string | null;
  env: Record<string, string> | null;
  enabled_plugins: Record<string, boolean> | null;
  skip_dangerous: boolean | null;
}

export interface BackupEntry {
  name: string;
  path: string;
  timestamp: string | null;
}

export type Page = "projects" | "sessions" | "config" | "commands";
