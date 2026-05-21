export interface Project {
  name: string;
  path: string;
  encoded_name: string;
  session_count: number;
  last_active: string | null;
  has_claude_md: boolean;
}

export interface ProjectMeta {
  custom_name?: string;
  tags?: string[];
  notes?: string;
}

export interface Message {
  role: string;
  content: ContentBlock[];
  timestamp: number | null;
}

export type ContentBlock =
  | { type: "text"; text: string }
  | { type: "tool_use"; id: string; name: string; input: unknown }
  | { type: "tool_result"; tool_use_id: string; content: unknown }
  | { type: "thinking"; thinking: string };

export interface Session {
  id: string;
  path: string;
  messages: Message[];
  started_at: string | null;
  display_name?: string;
  last_active: string | null;
  project_path?: string;
}

export interface SessionSearchResult {
  sessionId: string;
  matchCount: number;
  previewText: string;
  firstMatchIndex: number;
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

export interface CustomCommand {
  id: string;
  name: string;
  command: string;
  projectPath: string | null;
}

export interface CommandOutput {
  success: boolean;
  stdout: string;
  stderr: string;
  code: number | null;
}

export interface ProjectPermissions {
  defaultMode: string | null;
  allow: string[] | null;
  deny: string[] | null;
}

export interface HookCommand {
  type: string;
  command: string;
}

export interface HookEntry {
  matcher: string | null;
  hooks: HookCommand[];
}

export interface ProjectSettings {
  permissions: ProjectPermissions | null;
  hooks: Record<string, HookEntry[]> | null;
  env: Record<string, string> | null;
  model: string | null;
}

export interface ProjectMergeInfo {
  [primary: string]: string[];
}
