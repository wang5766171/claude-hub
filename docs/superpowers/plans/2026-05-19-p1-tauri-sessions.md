# P1: Tauri 桌面客户端搭建 + 项目与会话管理

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 claude-hub 从 ratatui TUI 迁移为 Tauri v2 桌面客户端，完成项目浏览和会话管理的完整功能。

**Architecture:** Tauri v2 桌面框架，Rust 后端处理文件系统操作和数据解析，React + shadcn/ui 前端负责交互。前后端通过 Tauri IPC (invoke) 通信。现有 Rust 模块（project/config/session/history）的核心逻辑直接复用，去掉 ratatui 依赖。

**Tech Stack:** Tauri v2, React 19, TypeScript, Vite, shadcn/ui, Tailwind CSS v4, Rust

---

## File Structure

### 新增文件

```
D:\MyCodes\claude-hub\
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.node.json
├── index.html
├── components.json                    # shadcn/ui config
├── src/                               # Frontend (React)
│   ├── main.tsx
│   ├── App.tsx
│   ├── App.css
│   ├── index.css
│   ├── lib/
│   │   └── utils.ts
│   ├── hooks/
│   │   └── use-invoke.ts
│   ├── types/
│   │   └── index.ts
│   ├── components/
│   │   ├── ui/                        # shadcn/ui components
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── input.tsx
│   │   │   ├── scroll-area.tsx
│   │   │   ├── separator.tsx
│   │   │   ├── skeleton.tsx
│   │   │   └── tooltip.tsx
│   │   ├── layout/
│   │   │   ├── app-layout.tsx
│   │   │   ├── sidebar.tsx
│   │   │   └── status-bar.tsx
│   │   ├── projects/
│   │   │   ├── project-card.tsx
│   │   │   ├── project-list.tsx
│   │   │   ├── project-detail.tsx
│   │   │   └── add-project-dialog.tsx
│   │   └── sessions/
│   │       ├── session-list.tsx
│   │       ├── session-detail.tsx
│   │       ├── message-view.tsx
│   │       └── rename-session-dialog.tsx
│   └── pages/
│       ├── projects-page.tsx
│       └── sessions-page.tsx
├── src-tauri/                         # Backend (Rust)
│   ├── Cargo.toml
│   ├── build.rs
│   ├── tauri.conf.json
│   ├── icons/                         # App icons (auto-generated)
│   └── src/
│       ├── main.rs
│       ├── lib.rs
│       ├── project.rs                 # Migrated from ../src/project.rs
│       ├── config.rs                  # Migrated from ../src/config.rs
│       ├── session.rs                 # Migrated from ../src/session.rs
│       ├── history.rs                 # Migrated from ../src/history.rs
│       └── hub.rs                     # New: ~/.claude-hub/ metadata
```

### 保留文件（最终删除）

```
├── src-old/                           # Renamed from src/, will delete after P1
│   ├── main.rs
│   ├── app.rs
│   ├── config.rs                      # superseded by src-tauri/src/config.rs
│   ├── event.rs
│   ├── history.rs                     # superseded by src-tauri/src/history.rs
│   ├── keybind.rs
│   ├── lib.rs
│   ├── project.rs                     # superseded by src-tauri/src/project.rs
│   ├── session.rs                     # superseded by src-tauri/src/session.rs
│   └── ui/
├── tests-old/                         # Renamed from tests/, will delete after P1
├── Cargo.old.toml                     # Renamed from Cargo.toml
```

---

## Task 1: Scaffold Tauri v2 project

**Files:**
- Rename: `src/` → `src-old/`
- Rename: `tests/` → `tests-old/`
- Rename: `Cargo.toml` → `Cargo.old.toml`
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`, `index.html`

- [ ] **Step 1: Rename old source directories to avoid conflicts**

```bash
mv src src-old
mv tests tests-old
mv Cargo.toml Cargo.old.toml
```

- [ ] **Step 2: Create package.json**

```json
{
  "name": "claude-hub",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "tauri": "tauri"
  },
  "dependencies": {
    "@tauri-apps/api": "^2",
    "@tauri-apps/plugin-dialog": "^2",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@tauri-apps/cli": "^2",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^4.4.0",
    "typescript": "~5.7.2",
    "vite": "^6.3.0"
  }
}
```

- [ ] **Step 3: Create vite.config.ts**

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

const host = process.env.TAURI_DEV_HOST;

export default defineConfig(async () => ({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
}));
```

- [ ] **Step 4: Create tsconfig files**

`tsconfig.json`:
```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" }
  ]
}
```

`tsconfig.app.json`:
```json
{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.app.tsbuildinfo",
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedSideEffectImports": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"]
}
```

`tsconfig.node.json`:
```json
{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.node.tsbuildinfo",
    "target": "ES2022",
    "lib": ["ES2023"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "moduleDetection": "force",
    "noEmit": true,
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedSideEffectImports": true
  },
  "include": ["vite.config.ts"]
}
```

- [ ] **Step 5: Create index.html**

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Claude Hub</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 6: Install npm dependencies**

Run: `npm install`
Expected: node_modules created, package-lock.json generated.

- [ ] **Step 7: Initialize Tauri v2**

Run: `npx tauri init --app-name "Claude Hub" --window-title "Claude Hub" --frontend-dist ../dist --dev-url http://localhost:1420 --before-dev-command "npm run dev" --before-build-command "npm run build" --ci`

Expected: `src-tauri/` directory created with Cargo.toml, tauri.conf.json, src/main.rs.

- [ ] **Step 8: Verify skeleton runs**

Run: `npx tauri dev`
Expected: Desktop window opens showing a blank page. Close the window to stop.

- [ ] **Step 9: Commit**

```bash
git add package.json package-lock.json vite.config.ts tsconfig*.json index.html src-tauri/ Cargo.old.toml
git commit -m "feat: scaffold Tauri v2 project with React + TypeScript"
```

---

## Task 2: Configure frontend (Tailwind CSS + shadcn/ui)

**Files:**
- Create: `src/main.tsx`, `src/App.tsx`, `src/App.css`, `src/index.css`, `src/lib/utils.ts`
- Create: `components.json`

- [ ] **Step 1: Create frontend entry files**

`src/main.tsx`:
```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

`src/App.tsx`:
```tsx
import "./App.css";

function App() {
  return (
    <div className="min-h-screen bg-background text-foreground p-8">
      <h1 className="text-2xl font-bold">Claude Hub</h1>
      <p className="text-muted-foreground mt-2">Desktop client for managing Claude Code</p>
    </div>
  );
}

export default App;
```

`src/App.css`:
```css
.logo {
  height: 6em;
  padding: 1.5em;
  will-change: filter;
  transition: filter 300ms;
}
.logo:hover {
  filter: drop-shadow(0 0 2em #24c8db);
}
```

`src/index.css`:
```css
@import "tailwindcss";
```

`src/lib/utils.ts`:
```ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 2: Install Tailwind CSS v4 and shadcn/ui dependencies**

```bash
npm install tailwindcss @tailwindcss/vite clsx tailwind-merge class-variance-authority lucide-react
```

- [ ] **Step 3: Update vite.config.ts to include Tailwind plugin**

Add `@tailwindcss/vite` plugin:

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

const host = process.env.TAURI_DEV_HOST;

export default defineConfig(async () => ({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
}));
```

- [ ] **Step 4: Initialize shadcn/ui**

Create `components.json`:
```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "src/index.css",
    "baseColor": "zinc",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  },
  "iconLibrary": "lucide"
}
```

- [ ] **Step 5: Update index.css with shadcn/ui CSS variables**

Replace `src/index.css` content:

```css
@import "tailwindcss";

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 240 10% 3.9%;
    --card: 0 0% 100%;
    --card-foreground: 240 10% 3.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 240 10% 3.9%;
    --primary: 240 5.9% 10%;
    --primary-foreground: 0 0% 98%;
    --secondary: 240 4.8% 95.9%;
    --secondary-foreground: 240 5.9% 10%;
    --muted: 240 4.8% 95.9%;
    --muted-foreground: 240 3.8% 46.1%;
    --accent: 240 4.8% 95.9%;
    --accent-foreground: 240 5.9% 10%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 0 0% 98%;
    --border: 240 5.9% 90%;
    --input: 240 5.9% 90%;
    --ring: 240 5.9% 10%;
    --radius: 0.5rem;
    --chart-1: 12 76% 61%;
    --chart-2: 173 58% 39%;
    --chart-3: 197 37% 24%;
    --chart-4: 43 74% 66%;
    --chart-5: 27 87% 67%;
    --sidebar-background: 0 0% 98%;
    --sidebar-foreground: 240 5.3% 26.1%;
    --sidebar-primary: 240 5.9% 10%;
    --sidebar-primary-foreground: 0 0% 98%;
    --sidebar-accent: 240 4.8% 95.9%;
    --sidebar-accent-foreground: 240 5.9% 10%;
    --sidebar-border: 220 13% 91%;
    --sidebar-ring: 217.2 91.2% 59.8%;
  }

  .dark {
    --background: 240 10% 3.9%;
    --foreground: 0 0% 98%;
    --card: 240 10% 3.9%;
    --card-foreground: 0 0% 98%;
    --popover: 240 10% 3.9%;
    --popover-foreground: 0 0% 98%;
    --primary: 0 0% 98%;
    --primary-foreground: 240 5.9% 10%;
    --secondary: 240 3.7% 15.9%;
    --secondary-foreground: 0 0% 98%;
    --muted: 240 3.7% 15.9%;
    --muted-foreground: 240 5% 64.9%;
    --accent: 240 3.7% 15.9%;
    --accent-foreground: 0 0% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 0 0% 98%;
    --border: 240 3.7% 15.9%;
    --input: 240 3.7% 15.9%;
    --ring: 240 4.9% 83.9%;
    --chart-1: 220 70% 50%;
    --chart-2: 160 60% 45%;
    --chart-3: 30 80% 55%;
    --chart-4: 280 65% 60%;
    --chart-5: 340 75% 55%;
    --sidebar-background: 240 5.9% 10%;
    --sidebar-foreground: 240 4.8% 95.9%;
    --sidebar-primary: 224.3 76.3% 48%;
    --sidebar-primary-foreground: 0 0% 100%;
    --sidebar-accent: 240 3.7% 15.9%;
    --sidebar-accent-foreground: 240 4.8% 95.9%;
    --sidebar-border: 240 3.7% 15.9%;
    --sidebar-ring: 217.2 91.2% 59.8%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  }
}
```

- [ ] **Step 6: Install shadcn/ui components needed for P1**

```bash
npx shadcn@latest add button card dialog input scroll-area separator skeleton tooltip -y
```

Expected: Components created in `src/components/ui/`.

- [ ] **Step 7: Verify frontend renders with styles**

Run: `npx tauri dev`
Expected: Window shows "Claude Hub" heading with proper typography and background.

- [ ] **Step 8: Commit**

```bash
git add src/ components.json vite.config.ts
git commit -m "feat: configure React + Tailwind CSS + shadcn/ui frontend"
```

---

## Task 3: Create TypeScript types and invoke hook

**Files:**
- Create: `src/types/index.ts`, `src/hooks/use-invoke.ts`

- [ ] **Step 1: Create type definitions matching Rust structs**

`src/types/index.ts`:
```ts
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

export interface SessionWithName extends Session {
  custom_name: string | null;
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
```

- [ ] **Step 2: Create Tauri invoke wrapper hook**

`src/hooks/use-invoke.ts`:
```ts
import { invoke } from "@tauri-apps/api/core";
import { useState, useEffect, useCallback } from "react";

interface UseInvokeResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useInvoke<T>(command: string, args?: Record<string, unknown>): UseInvokeResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(() => {
    setLoading(true);
    setError(null);
    invoke<T>(command, args)
      .then((result) => {
        setData(result);
        setLoading(false);
      })
      .catch((err) => {
        setError(String(err));
        setLoading(false);
      });
  }, [command, JSON.stringify(args)]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, loading, error, refetch: fetch };
}

export async function invokeCommand<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  return invoke<T>(command, args);
}
```

- [ ] **Step 3: Commit**

```bash
git add src/types/ src/hooks/
git commit -m "feat: add TypeScript types and Tauri invoke hook"
```

---

## Task 4: Migrate Rust backend modules to src-tauri

**Files:**
- Create: `src-tauri/src/project.rs` (migrated from `src-old/project.rs`)
- Create: `src-tauri/src/config.rs` (migrated from `src-old/config.rs`)
- Create: `src-tauri/src/session.rs` (migrated from `src-old/session.rs`)
- Create: `src-tauri/src/history.rs` (migrated from `src-old/history.rs`)
- Modify: `src-tauri/Cargo.toml`
- Modify: `src-tauri/src/lib.rs`

- [ ] **Step 1: Update src-tauri/Cargo.toml dependencies**

Add needed deps to `src-tauri/Cargo.toml` under `[dependencies]`:

```toml
[dependencies]
tauri = { version = "2", features = [] }
tauri-plugin-dialog = "2"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
chrono = { version = "0.4", features = ["serde"] }
dirs = "6"
```

- [ ] **Step 2: Migrate project.rs — add Serialize to structs**

Copy `src-old/project.rs` to `src-tauri/src/project.rs` with these changes:
- Add `#[derive(Serialize)]` to `Project` struct
- Add `serde::Serialize` to imports
- Add `#[serde(serialize_with = "serialize_pathbuf")]` for path field

`src-tauri/src/project.rs`:
```rust
use serde::Serialize;
use std::path::{Path, PathBuf};

fn serialize_pathbuf<S: serde::Serializer>(path: &PathBuf, s: S) -> Result<S::Ok, S::Error> {
    s.serialize_str(&path.to_string_lossy())
}

#[derive(Debug, Clone, Serialize)]
pub struct Project {
    pub name: String,
    #[serde(serialize_with = "serialize_pathbuf")]
    pub path: PathBuf,
    pub encoded_name: String,
    pub session_count: usize,
    pub last_active: Option<String>,
    pub has_claude_md: bool,
}

pub fn scan_projects() -> Vec<Project> {
    let home = match dirs::home_dir() {
        Some(h) => h,
        None => return Vec::new(),
    };
    let projects_dir = home.join(".claude").join("projects");
    if !projects_dir.exists() {
        return Vec::new();
    }

    let mut projects = Vec::new();
    if let Ok(entries) = std::fs::read_dir(&projects_dir) {
        for entry in entries.flatten() {
            let encoded_name = entry.file_name().to_string_lossy().to_string();
            if let Some(project) = parse_project(&projects_dir, &encoded_name) {
                projects.push(project);
            }
        }
    }
    projects.sort_by(|a, b| b.last_active.cmp(&a.last_active));
    projects
}

fn parse_project(projects_dir: &Path, encoded_name: &str) -> Option<Project> {
    let project_dir = projects_dir.join(encoded_name);
    if !project_dir.is_dir() {
        return None;
    }

    let decoded_path = decode_project_path(encoded_name);
    let name = Path::new(&decoded_path)
        .file_name()
        .unwrap_or_default()
        .to_string_lossy()
        .to_string();

    let session_count = count_sessions(&project_dir);
    let last_active = get_last_active(&project_dir);
    let has_claude_md = Path::new(&decoded_path).join(".claude").join("CLAUDE.md").exists();

    Some(Project {
        name,
        path: PathBuf::from(&decoded_path),
        encoded_name: encoded_name.to_string(),
        session_count,
        last_active,
        has_claude_md,
    })
}

pub fn decode_project_path(encoded: &str) -> String {
    if let Some(pos) = encoded.find("--") {
        let mut result = String::with_capacity(encoded.len() + 8);
        result.push_str(&encoded[..pos]);
        result.push_str(":\\");
        let rest = &encoded[pos + 2..];
        result.push_str(&rest.replace("--", "\\").replace('-', "\\"));
        result
    } else {
        encoded.replace('-', "\\")
    }
}

pub fn encode_project_path(path: &str) -> String {
    path.replace(':', "").replace('\\', "-").replace('/', "-")
}

pub fn add_project(path: &str) -> Option<Project> {
    let project_path = Path::new(path);
    if !project_path.join(".claude").exists() {
        return None;
    }

    let name = project_path.file_name()?.to_string_lossy().to_string();
    let encoded = encode_project_path(path);

    let home = dirs::home_dir()?;
    let claude_project_dir = home.join(".claude").join("projects").join(&encoded);

    let session_count = if claude_project_dir.exists() {
        count_sessions(&claude_project_dir)
    } else {
        0
    };

    let last_active = if claude_project_dir.exists() {
        get_last_active(&claude_project_dir)
    } else {
        None
    };

    Some(Project {
        name,
        path: project_path.to_path_buf(),
        encoded_name: encoded,
        session_count,
        last_active,
        has_claude_md: project_path.join(".claude").join("CLAUDE.md").exists(),
    })
}

fn count_sessions(dir: &Path) -> usize {
    std::fs::read_dir(dir)
        .map(|entries| entries.filter_map(|e| e.ok()).filter(|e| {
            e.path().extension().map(|ext| ext == "jsonl").unwrap_or(false)
        }).count())
        .unwrap_or(0)
}

fn get_last_active(dir: &Path) -> Option<String> {
    std::fs::read_dir(dir)
        .ok()?
        .filter_map(|e| e.ok())
        .filter(|e| e.path().extension().map(|ext| ext == "jsonl").unwrap_or(false))
        .filter_map(|e| e.metadata().ok()?.modified().ok())
        .max()
        .map(|t| {
            let datetime: chrono::DateTime<chrono::Local> = t.into();
            datetime.format("%Y-%m-%d %H:%M").to_string()
        })
}
```

- [ ] **Step 3: Migrate config.rs — no changes needed**

Copy `src-old/config.rs` to `src-tauri/src/config.rs` as-is. It already has Serialize/Deserialize and no TUI dependencies.

- [ ] **Step 4: Migrate session.rs — add Serialize to Session struct**

`src-tauri/src/session.rs`:
```rust
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};

fn serialize_pathbuf<S: serde::Serializer>(path: &PathBuf, s: S) -> Result<S::Ok, S::Error> {
    s.serialize_str(&path.to_string_lossy())
}

fn serialize_option_datetime<S: serde::Serializer>(dt: &Option<DateTime<Utc>>, s: S) -> Result<S::Ok, S::Error> {
    match dt {
        Some(d) => s.serialize_str(&d.to_rfc3339()),
        None => s.serialize_none(),
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Message {
    pub role: String,
    pub content: String,
    pub timestamp: Option<i64>,
}

#[derive(Debug, Clone, Serialize)]
pub struct Session {
    pub id: String,
    #[serde(serialize_with = "serialize_pathbuf")]
    pub path: PathBuf,
    pub messages: Vec<Message>,
    #[serde(serialize_with = "serialize_option_datetime")]
    pub started_at: Option<DateTime<Utc>>,
}

pub fn parse_message(line: &str) -> Option<Message> {
    if line.trim().is_empty() {
        return None;
    }
    let v: serde_json::Value = serde_json::from_str(line).ok()?;

    let role = v.get("type")?.as_str()?.to_string();

    let content = v.get("message")
        .and_then(|m| m.get("content"))
        .and_then(|c| {
            if c.is_string() {
                Some(c.as_str().unwrap_or("").to_string())
            } else {
                Some(c.to_string())
            }
        })
        .unwrap_or_default();

    let timestamp = v.get("timestamp").and_then(|t| t.as_i64());

    Some(Message { role, content, timestamp })
}

pub fn load_session(path: &Path) -> Option<Session> {
    let id = path.file_stem()?.to_string_lossy().to_string();
    let content = std::fs::read_to_string(path).ok()?;

    let messages: Vec<Message> = content.lines()
        .filter_map(|line| parse_message(line))
        .collect();

    let started_at = messages.first()
        .and_then(|m| m.timestamp)
        .map(|ts| DateTime::from_timestamp_millis(ts).unwrap_or_default());

    Some(Session {
        id,
        path: path.to_path_buf(),
        messages,
        started_at,
    })
}

pub fn list_sessions(project_dir: &Path) -> Vec<Session> {
    let mut sessions = Vec::new();
    if let Ok(entries) = std::fs::read_dir(project_dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.extension().map(|e| e == "jsonl").unwrap_or(false) {
                if let Some(session) = load_session(&path) {
                    sessions.push(session);
                }
            }
        }
    }
    sessions.sort_by(|a, b| b.started_at.cmp(&a.started_at));
    sessions
}
```

- [ ] **Step 5: Migrate history.rs — no changes needed**

Copy `src-old/history.rs` to `src-tauri/src/history.rs` as-is.

- [ ] **Step 6: Verify Rust modules compile**

Modify `src-tauri/src/lib.rs` to declare modules:

```rust
mod project;
mod config;
mod session;
mod history;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

Run: `cd src-tauri && cargo check`
Expected: Compiles without errors.

- [ ] **Step 7: Commit**

```bash
git add src-tauri/
git commit -m "feat: migrate Rust backend modules to Tauri project"
```

---

## Task 5: Add hub.rs for metadata management

**Files:**
- Create: `src-tauri/src/hub.rs`
- Modify: `src-tauri/src/lib.rs` (add `mod hub`)

- [ ] **Step 1: Write hub.rs — session names and state persistence**

`src-tauri/src/hub.rs`:
```rust
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;

fn hub_dir() -> Result<PathBuf, Box<dyn std::error::Error>> {
    let home = dirs::home_dir().ok_or("Cannot find home directory")?;
    let dir = home.join(".claude-hub");
    std::fs::create_dir_all(&dir)?;
    Ok(dir)
}

fn read_json<T: for<'de> Deserialize<'de>>(path: &PathBuf) -> Result<T, Box<dyn std::error::Error>> {
    let content = std::fs::read_to_string(path)?;
    Ok(serde_json::from_str(&content)?)
}

fn write_json<T: Serialize>(path: &PathBuf, data: &T) -> Result<(), Box<dyn std::error::Error>> {
    let json = serde_json::to_string_pretty(data)?;
    std::fs::write(path, json)?;
    Ok(())
}

// --- Session names ---

#[derive(Debug, Serialize, Deserialize, Default)]
pub struct SessionNames {
    pub names: HashMap<String, String>,
}

fn session_names_path() -> Result<PathBuf, Box<dyn std::error::Error>> {
    Ok(hub_dir()?.join("sessions.json"))
}

pub fn get_session_names() -> Result<HashMap<String, String>, Box<dyn std::error::Error>> {
    let path = session_names_path()?;
    if !path.exists() {
        return Ok(HashMap::new());
    }
    let data: SessionNames = read_json(&path)?;
    Ok(data.names)
}

pub fn rename_session(session_id: String, name: String) -> Result<(), Box<dyn std::error::Error>> {
    let path = session_names_path()?;
    let mut data = if path.exists() {
        read_json::<SessionNames>(&path)?
    } else {
        SessionNames::default()
    };
    data.names.insert(session_id, name);
    write_json(&path, &data)
}

pub fn delete_session_name(session_id: String) -> Result<(), Box<dyn std::error::Error>> {
    let path = session_names_path()?;
    if !path.exists() {
        return Ok(());
    }
    let mut data: SessionNames = read_json(&path)?;
    data.names.remove(&session_id);
    write_json(&path, &data)
}

// --- App state ---

#[derive(Debug, Serialize, Deserialize)]
pub struct AppState {
    pub last_page: Option<String>,
    pub last_project: Option<String>,
}

fn state_path() -> Result<PathBuf, Box<dyn std::error::Error>> {
    Ok(hub_dir()?.join("state.json"))
}

pub fn load_state() -> Result<AppState, Box<dyn std::error::Error>> {
    let path = state_path()?;
    if !path.exists() {
        return Ok(AppState { last_page: None, last_project: None });
    }
    read_json(&path)
}

pub fn save_state(state: &AppState) -> Result<(), Box<dyn std::error::Error>> {
    let path = state_path()?;
    write_json(&path, state)
}
```

- [ ] **Step 2: Add `mod hub` to lib.rs**

Add `mod hub;` to `src-tauri/src/lib.rs`.

- [ ] **Step 3: Verify compilation**

Run: `cd src-tauri && cargo check`
Expected: Compiles without errors.

- [ ] **Step 4: Commit**

```bash
git add src-tauri/src/hub.rs src-tauri/src/lib.rs
git commit -m "feat: add hub.rs for ~/.claude-hub/ metadata management"
```

---

## Task 6: Register Tauri IPC commands

**Files:**
- Modify: `src-tauri/src/lib.rs` (register commands)
- Modify: `src-tauri/src/main.rs` (call lib::run)

- [ ] **Step 1: Add Tauri command functions to lib.rs**

Replace `src-tauri/src/lib.rs` with:

```rust
mod project;
mod config;
mod session;
mod history;
mod hub;

use std::path::Path;

#[tauri::command]
fn scan_projects() -> Vec<project::Project> {
    project::scan_projects()
}

#[tauri::command]
fn add_project(path: String) -> Result<project::Project, String> {
    project::add_project(&path).ok_or_else(|| format!("No .claude directory found at: {}", path))
}

#[tauri::command]
fn remove_project(encoded_name: String) -> Result<(), String> {
    Ok(())
}

#[tauri::command]
fn list_sessions(encoded_name: String) -> Result<Vec<session::Session>, String> {
    let home = dirs::home_dir().ok_or("Cannot find home directory")?;
    let project_dir = home.join(".claude").join("projects").join(&encoded_name);
    if !project_dir.exists() {
        return Err(format!("Project directory not found: {}", encoded_name));
    }
    Ok(session::list_sessions(&project_dir))
}

#[tauri::command]
fn get_session_messages(session_id: String, encoded_name: String) -> Result<Vec<session::Message>, String> {
    let home = dirs::home_dir().ok_or("Cannot find home directory")?;
    let session_path = home.join(".claude").join("projects").join(&encoded_name).join(format!("{}.jsonl", session_id));
    if !session_path.exists() {
        return Err(format!("Session file not found: {}", session_id));
    }
    session::load_session(&session_path)
        .map(|s| s.messages)
        .ok_or_else(|| format!("Failed to parse session: {}", session_id))
}

#[tauri::command]
fn get_session_names() -> Result<std::collections::HashMap<String, String>, String> {
    hub::get_session_names().map_err(|e| e.to_string())
}

#[tauri::command]
fn rename_session(session_id: String, name: String) -> Result<(), String> {
    hub::rename_session(session_id, name).map_err(|e| e.to_string())
}

#[tauri::command]
fn delete_session_name(session_id: String) -> Result<(), String> {
    hub::delete_session_name(session_id).map_err(|e| e.to_string())
}

#[tauri::command]
fn load_config() -> Result<config::ClaudeConfig, String> {
    config::load_config().map_err(|e| e.to_string())
}

#[tauri::command]
fn load_history() -> Vec<history::HistoryEntry> {
    history::load_history()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            scan_projects,
            add_project,
            remove_project,
            list_sessions,
            get_session_messages,
            get_session_names,
            rename_session,
            delete_session_name,
            load_config,
            load_history,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

- [ ] **Step 2: Ensure main.rs calls lib::run**

`src-tauri/src/main.rs` should be:

```rust
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    claude_hub_lib::run()
}
```

Note: Check what `tauri init` generated for the lib crate name. It may be `claude_hub_lib` or `app_lib`. Look at the `lib.name` in `src-tauri/Cargo.toml` and adjust accordingly.

- [ ] **Step 3: Verify full compilation**

Run: `cd src-tauri && cargo check`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add src-tauri/src/
git commit -m "feat: register Tauri IPC commands for projects and sessions"
```

---

## Task 7: Build app layout and sidebar

**Files:**
- Create: `src/components/layout/app-layout.tsx`
- Create: `src/components/layout/sidebar.tsx`
- Create: `src/components/layout/status-bar.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Create AppLayout component**

`src/components/layout/app-layout.tsx`:
```tsx
import type { ReactNode } from "react";
import { Sidebar } from "./sidebar";
import { StatusBar } from "./status-bar";
import type { Page } from "@/types";

interface AppLayoutProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  modelName: string | null;
  projectCount: number;
  children: ReactNode;
}

export function AppLayout({ currentPage, onNavigate, modelName, projectCount, children }: AppLayoutProps) {
  return (
    <div className="flex h-screen flex-col bg-background">
      <div className="flex flex-1 overflow-hidden">
        <Sidebar currentPage={currentPage} onNavigate={onNavigate} />
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
      <StatusBar modelName={modelName} projectCount={projectCount} />
    </div>
  );
}
```

- [ ] **Step 2: Create Sidebar component**

`src/components/layout/sidebar.tsx`:
```tsx
import { FolderOpen, MessageSquare, Settings, Rocket } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Page } from "@/types";

interface SidebarProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
}

const navItems: { page: Page; icon: typeof FolderOpen; label: string }[] = [
  { page: "projects", icon: FolderOpen, label: "Projects" },
  { page: "sessions", icon: MessageSquare, label: "Sessions" },
  { page: "config", icon: Settings, label: "Config" },
  { page: "commands", icon: Rocket, label: "Commands" },
];

export function Sidebar({ currentPage, onNavigate }: SidebarProps) {
  return (
    <aside className="flex w-52 flex-col border-r border-border bg-card">
      <div className="border-b border-border p-4">
        <h1 className="text-lg font-semibold">Claude Hub</h1>
        <p className="text-xs text-muted-foreground">v0.1.0</p>
      </div>
      <nav className="flex-1 p-2">
        {navItems.map(({ page, icon: Icon, label }) => (
          <button
            key={page}
            onClick={() => onNavigate(page)}
            className={cn(
              "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
              currentPage === page
                ? "bg-accent text-accent-foreground font-medium"
                : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </nav>
    </aside>
  );
}
```

- [ ] **Step 3: Create StatusBar component**

`src/components/layout/status-bar.tsx`:
```tsx
interface StatusBarProps {
  modelName: string | null;
  projectCount: number;
}

export function StatusBar({ modelName, projectCount }: StatusBarProps) {
  return (
    <footer className="flex items-center gap-4 border-t border-border bg-card px-4 py-1.5 text-xs text-muted-foreground">
      <span>Model: {modelName ?? "default"}</span>
      <span>Projects: {projectCount}</span>
    </footer>
  );
}
```

- [ ] **Step 4: Update App.tsx with layout and routing**

`src/App.tsx`:
```tsx
import { useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { ProjectsPage } from "@/pages/projects-page";
import { SessionsPage } from "@/pages/sessions-page";
import { useInvoke } from "@/hooks/use-invoke";
import type { Page, Project, ClaudeConfig } from "@/types";

function App() {
  const [currentPage, setCurrentPage] = useState<Page>("projects");
  const { data: projects } = useInvoke<Project[]>("scan_projects");
  const { data: config } = useInvoke<ClaudeConfig>("load_config");

  return (
    <AppLayout
      currentPage={currentPage}
      onNavigate={setCurrentPage}
      modelName={config?.model ?? null}
      projectCount={projects?.length ?? 0}
    >
      {currentPage === "projects" && <ProjectsPage />}
      {currentPage === "sessions" && <SessionsPage />}
      {currentPage === "config" && (
        <div className="text-muted-foreground">Config management coming in P2</div>
      )}
      {currentPage === "commands" && (
        <div className="text-muted-foreground">Commands coming in P3</div>
      )}
    </AppLayout>
  );
}

export default App;
```

- [ ] **Step 5: Create placeholder pages**

`src/pages/projects-page.tsx`:
```tsx
export function ProjectsPage() {
  return <div>Projects page placeholder</div>;
}
```

`src/pages/sessions-page.tsx`:
```tsx
export function SessionsPage() {
  return <div>Sessions page placeholder</div>;
}
```

- [ ] **Step 6: Verify layout renders**

Run: `npx tauri dev`
Expected: Desktop window with sidebar navigation, clicking items changes the content area. Status bar shows model and project count from real data.

- [ ] **Step 7: Commit**

```bash
git add src/components/layout/ src/pages/ src/App.tsx
git commit -m "feat: add app layout with sidebar navigation and status bar"
```

---

## Task 8: Build Projects page

**Files:**
- Create: `src/components/projects/project-card.tsx`
- Create: `src/components/projects/project-list.tsx`
- Create: `src/components/projects/project-detail.tsx`
- Create: `src/components/projects/add-project-dialog.tsx`
- Modify: `src/pages/projects-page.tsx`

- [ ] **Step 1: Create ProjectCard component**

`src/components/projects/project-card.tsx`:
```tsx
import { Card, CardContent } from "@/components/ui/card";
import { FolderOpen, FileText, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Project } from "@/types";

interface ProjectCardProps {
  project: Project;
  selected: boolean;
  onClick: () => void;
}

export function ProjectCard({ project, selected, onClick }: ProjectCardProps) {
  return (
    <Card
      className={cn(
        "cursor-pointer transition-colors hover:border-primary/50",
        selected && "border-primary ring-1 ring-primary/20"
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-medium">{project.name}</h3>
          </div>
          {project.has_claude_md && (
            <FileText className="h-4 w-4 text-green-500" title="Has CLAUDE.md" />
          )}
        </div>
        <p className="mt-1 truncate text-xs text-muted-foreground" title={project.path}>
          {project.path}
        </p>
        <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <MessageSquare className="h-3 w-3" />
            {project.session_count} sessions
          </span>
          {project.last_active && <span>{project.last_active}</span>}
        </div>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Create ProjectDetail slide-in panel**

`src/components/projects/project-detail.tsx`:
```tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { X, FolderOpen, ExternalLink } from "lucide-react";
import type { Project } from "@/types";

interface ProjectDetailProps {
  project: Project;
  onClose: () => void;
  onViewSessions: (encodedName: string) => void;
}

export function ProjectDetail({ project, onClose, onViewSessions }: ProjectDetailProps) {
  return (
    <div className="fixed inset-y-0 right-0 z-10 w-96 border-l border-border bg-card shadow-lg animate-in slide-in-from-right duration-200">
      <div className="flex items-center justify-between border-b border-border p-4">
        <h2 className="font-semibold">{project.name}</h2>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="p-4 space-y-4">
        <Card>
          <CardContent className="p-3 space-y-2 text-sm">
            <div>
              <span className="text-muted-foreground">Path:</span>
              <p className="font-mono text-xs break-all">{project.path}</p>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-muted-foreground">Sessions</span>
              <span className="font-medium">{project.session_count}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Last Active</span>
              <span className="font-medium">{project.last_active ?? "N/A"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">CLAUDE.md</span>
              <span className={project.has_claude_md ? "text-green-500" : "text-muted-foreground"}>
                {project.has_claude_md ? "Yes" : "No"}
              </span>
            </div>
          </CardContent>
        </Card>
        <div className="space-y-2">
          <Button className="w-full" onClick={() => onViewSessions(project.encoded_name)}>
            <MessageSquare className="mr-2 h-4 w-4" />
            View Sessions
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => {/* P3: open terminal */}}
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            Open in Terminal
          </Button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create AddProjectDialog**

`src/components/projects/add-project-dialog.tsx`:
```tsx
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { invokeCommand } from "@/hooks/use-invoke";
import type { Project } from "@/types";

interface AddProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdded: (project: Project) => void;
}

export function AddProjectDialog({ open, onOpenChange, onAdded }: AddProjectDialogProps) {
  const [path, setPath] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!path.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const project = await invokeCommand<Project>("add_project", { path: path.trim() });
      onAdded(project);
      setPath("");
      onOpenChange(false);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Project</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <Input
            placeholder="D:\MyCodes\my-project"
            value={path}
            onChange={(e) => setPath(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading || !path.trim()}>
            Add
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 4: Build ProjectsPage**

`src/pages/projects-page.tsx`:
```tsx
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, FolderOpen } from "lucide-react";
import { useInvoke } from "@/hooks/use-invoke";
import { ProjectCard } from "@/components/projects/project-card";
import { ProjectDetail } from "@/components/projects/project-detail";
import { AddProjectDialog } from "@/components/projects/add-project-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import type { Project } from "@/types";

export function ProjectsPage() {
  const { data: projects, loading, refetch } = useInvoke<Project[]>("scan_projects");
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  const handleViewSessions = (encodedName: string) => {
    // Will be wired in Task 9 (Sessions page)
  };

  const handleProjectAdded = () => {
    refetch();
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-32" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Projects</h2>
        <Button onClick={() => setAddDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Project
        </Button>
      </div>

      {!projects || projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <FolderOpen className="h-12 w-12 mb-4" />
          <p>No projects found</p>
          <p className="text-sm">Add a project with a .claude directory to get started</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard
              key={project.encoded_name}
              project={project}
              selected={selectedProject?.encoded_name === project.encoded_name}
              onClick={() => setSelectedProject(project)}
            />
          ))}
        </div>
      )}

      {selectedProject && (
        <ProjectDetail
          project={selectedProject}
          onClose={() => setSelectedProject(null)}
          onViewSessions={handleViewSessions}
        />
      )}

      <AddProjectDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onAdded={handleProjectAdded}
      />
    </div>
  );
}
```

- [ ] **Step 5: Verify Projects page works**

Run: `npx tauri dev`
Expected: Projects page shows real projects from `~/.claude/projects/`. Click a card to see detail panel. Add button opens dialog.

- [ ] **Step 6: Commit**

```bash
git add src/components/projects/ src/pages/projects-page.tsx
git commit -m "feat: implement Projects page with cards, detail panel, and add dialog"
```

---

## Task 9: Build Sessions page

**Files:**
- Create: `src/components/sessions/session-list.tsx`
- Create: `src/components/sessions/session-detail.tsx`
- Create: `src/components/sessions/message-view.tsx`
- Create: `src/components/sessions/rename-session-dialog.tsx`
- Modify: `src/pages/sessions-page.tsx`
- Modify: `src/App.tsx` (wire navigation from projects → sessions)

- [ ] **Step 1: Create SessionList component**

`src/components/sessions/session-list.tsx`:
```tsx
import { cn } from "@/lib/utils";
import { MessageSquare, Clock } from "lucide-react";
import type { Session } from "@/types";

interface SessionListProps {
  sessions: Session[];
  sessionNames: Record<string, string>;
  selectedId: string | null;
  onSelect: (sessionId: string) => void;
}

export function SessionList({ sessions, sessionNames, selectedId, onSelect }: SessionListProps) {
  return (
    <div className="space-y-1">
      {sessions.map((session) => {
        const displayName = sessionNames[session.id] || session.id.slice(0, 8);
        const hasCustomName = !!sessionNames[session.id];

        return (
          <button
            key={session.id}
            onClick={() => onSelect(session.id)}
            className={cn(
              "flex w-full items-center justify-between rounded-md px-3 py-2 text-sm transition-colors",
              selectedId === session.id
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-accent/50"
            )}
          >
            <div className="flex items-center gap-2 min-w-0">
              <MessageSquare className="h-3.5 w-3.5 shrink-0" />
              <div className="truncate">
                <span className={cn(hasCustomName && "font-medium")}>{displayName}</span>
                {hasCustomName && (
                  <span className="ml-2 text-xs text-muted-foreground">{session.id.slice(0, 8)}</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs shrink-0 ml-2">
              <span>{session.messages.length} msg</span>
              {session.started_at && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {new Date(session.started_at).toLocaleDateString()}
                </span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Create MessageView component**

`src/components/sessions/message-view.tsx`:
```tsx
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { User, Bot } from "lucide-react";
import type { Message } from "@/types";

interface MessageViewProps {
  messages: Message[];
}

function formatTimestamp(ts: number | null): string {
  if (!ts) return "";
  return new Date(ts).toLocaleString();
}

export function MessageView({ messages }: MessageViewProps) {
  return (
    <ScrollArea className="h-full">
      <div className="space-y-4 p-4">
        {messages.map((msg, i) => (
          <div key={i} className={cn("flex gap-3", msg.role === "human" ? "" : "")}>
            <div className={cn(
              "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
              msg.role === "human"
                ? "bg-blue-100 text-blue-600"
                : "bg-emerald-100 text-emerald-600"
            )}>
              {msg.role === "human" ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium">
                  {msg.role === "human" ? "User" : "Assistant"}
                </span>
                {msg.timestamp && (
                  <span className="text-xs text-muted-foreground">{formatTimestamp(msg.timestamp)}</span>
                )}
              </div>
              <div className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">
                {msg.content}
              </div>
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
```

- [ ] **Step 3: Create RenameSessionDialog**

`src/components/sessions/rename-session-dialog.tsx`:
```tsx
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { invokeCommand } from "@/hooks/use-invoke";

interface RenameSessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string;
  currentName: string;
  onRenamed: () => void;
}

export function RenameSessionDialog({ open, onOpenChange, sessionId, currentName, onRenamed }: RenameSessionDialogProps) {
  const [name, setName] = useState(currentName);

  useEffect(() => {
    setName(currentName);
  }, [currentName, open]);

  const handleSubmit = async () => {
    if (name.trim()) {
      await invokeCommand("rename_session", { sessionId, name: name.trim() });
    } else {
      await invokeCommand("delete_session_name", { sessionId });
    }
    onRenamed();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rename Session</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <Input
            placeholder="Enter session name (leave empty to reset)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          />
          <p className="mt-2 text-xs text-muted-foreground">Session ID: {sessionId.slice(0, 16)}...</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 4: Create SessionDetail component**

`src/components/sessions/session-detail.tsx`:
```tsx
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Pencil } from "lucide-react";
import { MessageView } from "./message-view";
import { RenameSessionDialog } from "./rename-session-dialog";
import type { Message } from "@/types";

interface SessionDetailProps {
  sessionId: string;
  displayName: string;
  messages: Message[];
  onBack: () => void;
  onRenamed: () => void;
}

export function SessionDetail({ sessionId, displayName, messages, onBack, onRenamed }: SessionDetailProps) {
  const [renameOpen, setRenameOpen] = useState(false);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h3 className="font-medium">{displayName}</h3>
          <span className="text-xs text-muted-foreground">{sessionId.slice(0, 8)}</span>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setRenameOpen(true)}>
          <Pencil className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex-1 overflow-hidden">
        <MessageView messages={messages} />
      </div>
      <RenameSessionDialog
        open={renameOpen}
        onOpenChange={setRenameOpen}
        sessionId={sessionId}
        currentName={displayName}
        onRenamed={onRenamed}
      />
    </div>
  );
}
```

- [ ] **Step 5: Build SessionsPage**

`src/pages/sessions-page.tsx`:
```tsx
import { useState } from "react";
import { useInvoke, invokeCommand } from "@/hooks/use-invoke";
import { SessionList } from "@/components/sessions/session-list";
import { SessionDetail } from "@/components/sessions/session-detail";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquare } from "lucide-react";
import type { Session, Project } from "@/types";

export function SessionsPage() {
  const { data: projects, loading: projectsLoading } = useInvoke<Project[]>("scan_projects");
  const { data: sessionNames, refetch: refetchNames } = useInvoke<Record<string, string>>("get_session_names");

  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [sessionMessages, setSessionMessages] = useState<import("@/types").Message[]>([]);

  const { data: sessions } = useInvoke<Session[]>(
    selectedProject ? "list_sessions" : "",
    selectedProject ? { encodedName: selectedProject } : undefined
  );

  const handleSelectSession = async (sessionId: string) => {
    setSelectedSession(sessionId);
    if (selectedProject) {
      const messages = await invokeCommand<import("@/types").Message[]>("get_session_messages", {
        sessionId,
        encodedName: selectedProject,
      });
      setSessionMessages(messages);
    }
  };

  const handleBack = () => {
    setSelectedSession(null);
    setSessionMessages([]);
  };

  if (projectsLoading) {
    return <Skeleton className="h-64" />;
  }

  const currentSession = sessions?.find((s) => s.id === selectedSession);
  const displayName = selectedSession && sessionNames
    ? sessionNames[selectedSession] || selectedSession.slice(0, 8)
    : "";

  return (
    <div className="flex h-[calc(100vh-5rem)] gap-4">
      {/* Project selector */}
      <div className="w-48 shrink-0 space-y-2">
        <h3 className="text-sm font-medium text-muted-foreground">Projects</h3>
        <div className="space-y-1">
          {projects?.filter((p) => p.session_count > 0).map((project) => (
            <button
              key={project.encoded_name}
              onClick={() => {
                setSelectedProject(project.encoded_name);
                setSelectedSession(null);
              }}
              className={`block w-full rounded px-2 py-1 text-left text-sm truncate ${
                selectedProject === project.encoded_name
                  ? "bg-accent font-medium"
                  : "text-muted-foreground hover:bg-accent/50"
              }`}
            >
              {project.name}
            </button>
          ))}
        </div>
      </div>

      {/* Session list */}
      <div className="w-72 shrink-0 border-l border-border pl-4">
        {!selectedProject ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <MessageSquare className="h-8 w-8 mb-2" />
            <p className="text-sm">Select a project</p>
          </div>
        ) : selectedSession && currentSession ? (
          <SessionDetail
            sessionId={selectedSession}
            displayName={displayName}
            messages={sessionMessages}
            onBack={handleBack}
            onRenamed={refetchNames}
          />
        ) : (
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground">Sessions</h3>
            {sessions && sessionNames && (
              <SessionList
                sessions={sessions}
                sessionNames={sessionNames}
                selectedId={null}
                onSelect={handleSelectSession}
              />
            )}
          </div>
        )}
      </div>

      {/* Empty state for message area when no session selected */}
      {!selectedSession && (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          <p>Select a session to view messages</p>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 6: Wire project→session navigation in App.tsx**

Update `src/App.tsx` to accept a `navigateToSession` prop and pass it down:

```tsx
import { useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { ProjectsPage } from "@/pages/projects-page";
import { SessionsPage } from "@/pages/sessions-page";
import { useInvoke } from "@/hooks/use-invoke";
import type { Page, Project, ClaudeConfig } from "@/types";

function App() {
  const [currentPage, setCurrentPage] = useState<Page>("projects");
  const { data: projects, refetch: refetchProjects } = useInvoke<Project[]>("scan_projects");
  const { data: config } = useInvoke<ClaudeConfig>("load_config");

  const navigateToSession = (encodedName: string) => {
    setCurrentPage("sessions");
  };

  return (
    <AppLayout
      currentPage={currentPage}
      onNavigate={setCurrentPage}
      modelName={config?.model ?? null}
      projectCount={projects?.length ?? 0}
    >
      {currentPage === "projects" && (
        <ProjectsPage onViewSessions={navigateToSession} />
      )}
      {currentPage === "sessions" && <SessionsPage />}
      {currentPage === "config" && (
        <div className="text-muted-foreground">Config management coming in P2</div>
      )}
      {currentPage === "commands" && (
        <div className="text-muted-foreground">Commands coming in P3</div>
      )}
    </AppLayout>
  );
}

export default App;
```

Update `ProjectsPage` props to accept `onViewSessions`:
Update the `ProjectsPage` component signature to accept `onViewSessions?: (encodedName: string) => void` and wire it to the ProjectDetail button.

- [ ] **Step 7: Verify Sessions page works end-to-end**

Run: `npx tauri dev`
Expected:
1. Click Projects → see project cards
2. Click a project card → detail panel slides in
3. Click "View Sessions" → navigates to Sessions page
4. Select a project in left column → session list loads
5. Click a session → messages display with User/Assistant roles
6. Click pencil icon → rename dialog opens → type name → save
7. Name persists across session (stored in `~/.claude-hub/sessions.json`)

- [ ] **Step 8: Commit**

```bash
git add src/components/sessions/ src/pages/sessions-page.tsx src/App.tsx
git commit -m "feat: implement Sessions page with two-level navigation and rename"
```

---

## Task 10: Clean up old TUI code and update config

**Files:**
- Delete: `src-old/`, `tests-old/`, `Cargo.old.toml`
- Modify: `CLAUDE.md`, `.claude/CLAUDE.md`
- Modify: `src-tauri/tauri.conf.json` (window size, etc.)

- [ ] **Step 1: Delete old TUI source files**

```bash
rm -rf src-old tests-old Cargo.old.toml
```

- [ ] **Step 2: Configure tauri.conf.json window settings**

Update `src-tauri/tauri.conf.json` to set:
- `"width": 1100`
- `"height": 700`
- `"minWidth": 800`
- `"minHeight": 500`
- `"title": "Claude Hub"`
- `"resizable": true`

- [ ] **Step 3: Update CLAUDE.md with new project structure**

Replace the Architecture and Build sections in `CLAUDE.md` to reflect Tauri project structure.

- [ ] **Step 4: Final verification**

Run: `npx tauri dev`
Expected: Full application works — projects, sessions, rename. No old TUI artifacts.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: complete P1 — Tauri desktop client with project and session management"
```
