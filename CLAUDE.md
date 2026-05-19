# Claude Hub

A Tauri desktop app for managing Claude Code projects, sessions, and configuration.

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
- `src-tauri/src/lib.rs` — IPC command registration
- `src-tauri/src/project.rs` — Scan projects from ~/.claude/projects/, path encoding
- `src-tauri/src/config.rs` — Load/save/backup/restore Claude settings.json
- `src-tauri/src/session.rs` — Parse JSONL session files
- `src-tauri/src/history.rs` — Load ~/.claude/history.jsonl
- `src-tauri/src/hub.rs` — Manage ~/.claude-hub/ metadata (session names, state)
- `src/` — React + TypeScript frontend
- `src/components/layout/` — AppLayout, Sidebar, StatusBar
- `src/components/projects/` — ProjectCard, ProjectDetail, AddProjectDialog
- `src/components/sessions/` — SessionList, SessionDetail, MessageView, RenameSessionDialog
- `src/pages/` — ProjectsPage, SessionsPage

## Data Locations

- Projects: `~/.claude/projects/<encoded-path>/`
- Config: `~/.claude/settings.json`
- History: `~/.claude/history.jsonl`
- Backups: `~/.claude/backups/`
- Hub data: `~/.claude-hub/` (session names, presets, state)
