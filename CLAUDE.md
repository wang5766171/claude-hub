# Jishu Hub (机枢)

A Tauri desktop hub for managing AI agent projects, sessions, and configuration. Currently supports Claude Code CLI with a plugin architecture for future agents.

## Build

```bash
npm run tauri build
```

## Dev

```bash
npm run tauri dev
```

## Test (Rust backend)

```bash
cd src-tauri && cargo test
```

## Architecture

- `src-tauri/src/main.rs` — Tauri entry point
- `src-tauri/src/lib.rs` — IPC command registration, AppState with AgentRegistry
- `src-tauri/src/agent/` — Plugin abstraction layer
  - `agent/mod.rs` — AgentPlugin trait + AgentRegistry
  - `agent/claude_code.rs` — Claude Code CLI implementation
- `src-tauri/src/project.rs` — Scan projects from ~/.claude/projects/, path encoding
- `src-tauri/src/config.rs` — Load/save/backup/restore Claude settings.json
- `src-tauri/src/session.rs` — Parse JSONL session files
- `src-tauri/src/history.rs` — Load ~/.claude/history.jsonl
- `src-tauri/src/hub.rs` — Manage ~/.jishu-hub/ metadata (session names, state, presets)
- `src-tauri/src/chat.rs` — Spawn CLI processes, stream events
- `src/` — React + TypeScript frontend
- `src/pages/chat-page.tsx` — Main two-column chat view
- `src/pages/manage-page.tsx` — Project/config/commands management
- `src/components/sessions/` — MessageView, ChatInput, StreamingMessage

## Data Locations

- Agent data: `~/.claude/` (Claude Code specific)
- Projects: `~/.claude/projects/<encoded-path>/`
- Config: `~/.claude/settings.json`
- History: `~/.claude/history.jsonl`
- Backups: `~/.claude/backups/`
- Hub data: `~/.jishu-hub/` (session names, presets, state, agents)
