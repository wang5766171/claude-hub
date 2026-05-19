# Claude Hub

A terminal UI for managing Claude Code projects, sessions, and configuration.

## Build

```bash
cargo build
```

## Test

```bash
cargo test
```

## Run

```bash
cargo run
```

## Architecture

- `src/main.rs` — Entry point, TUI event loop
- `src/app.rs` — App state machine with Mode enum and key handling
- `src/config.rs` — Load/save/backup/restore Claude settings.json
- `src/project.rs` — Scan projects from ~/.claude/projects/, path encoding
- `src/session.rs` — Parse JSONL session files, list sessions per project
- `src/history.rs` — Load and parse ~/.claude/history.jsonl
- `src/ui/mod.rs` — UI module root
- `src/ui/sidebar.rs` — Project list panel
- `src/ui/main_panel.rs` — Main content panel (detail, config, presets, sessions)
- `src/ui/detail.rs` — Detail/history panel
- `src/ui/status_bar.rs` — Status bar with model info
- `src/ui/help_overlay.rs` — Help overlay

## Keybindings

- `j/k` or `Up/Down` — Navigate
- `Enter` — Select / view sessions
- `Tab` — Switch between Projects and Config panels
- `m` — Open model preset switcher (in Config mode)
- `a` — Add project by path (in ProjectList mode)
- `d` — Remove project from view (in ProjectDetail mode)
- `?` — Toggle help
- `Esc` — Go back / cancel
- `q` — Quit

## Data Locations

- Projects: `~/.claude/projects/<encoded-path>/`
- Config: `~/.claude/settings.json`
- History: `~/.claude/history.jsonl`
- Backups: `~/.claude/backups/`
