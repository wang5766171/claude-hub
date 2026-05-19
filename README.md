# Claude Hub

A terminal UI for managing [Claude Code](https://docs.anthropic.com/en/docs/claude-code) projects, configurations, and sessions.

```
┌─── Projects ───┬────── Project Detail ──────┬───────── Detail ─────────┐
│                 │                            │                          │
│ ▸ Claude (6)    │ Name: Claude               │ {                        │
│   Milk-Order(3) │ Path: E:\Claude            │   "permissions": {       │
│   kiddo-ai (2)  │ Sessions: 6                │     "defaultMode":       │
│   skills (1)    │ Last Active: 2026-05-19    │       "bypassPermissions"│
│                 │ CLAUDE.md: Yes             │   }                      │
│                 │                            │ }                        │
│                 │                            │                          │
├─────────────────┴────────────────────────────┴──────────────────────────┤
│ q:Quit | Tab:Switch | j/k:Nav | ?:Help | Model: opus | Projects: 4     │
└─────────────────────────────────────────────────────────────────────────┘
```

## Features

- **Project Management** — Auto-discovers all Claude Code projects from `~/.claude/projects/`, displays session counts, last active time, and project settings
- **Global Config Editor** — View and edit `~/.claude/settings.json` directly: switch models, modify environment variables, toggle plugins
- **Model Presets** — Quick-switch between Opus, Sonnet, Haiku, or custom models with one keypress
- **Session Browser** — Browse conversation history for each project
- **Config Backup** — Automatic backup before every config change, one-key restore
- **Add Projects** — Add new project paths and auto-link to Claude's project data

## Keybindings

| Key | Action |
|-----|--------|
| `q` | Quit |
| `Tab` | Switch between Project / Config mode |
| `j` / `k` / Arrow keys | Navigate list |
| `Enter` | Open selected item |
| `Esc` | Go back / Cancel |
| `a` | Add project (in Project mode) |
| `d` | Remove from view (in Project mode) |
| `m` | Model preset switcher (in Config mode) |
| `?` | Help overlay |

## Prerequisites

- **Rust** 1.70+ (install via [rustup](https://rustup.rs/))
- **Claude Code** CLI installed and configured

### Windows (MSVC)

If you have Visual Studio Build Tools installed:

```bash
rustup default stable-x86_64-pc-windows-msvc
```

### Windows (GNU / MinGW)

If you prefer MinGW-w64:

```bash
rustup default stable-x86_64-pc-windows-gnu
```

## Install

### From Source

```bash
git clone https://github.com/<your-username>/claude-hub.git
cd claude-hub
cargo build --release
```

The binary will be at `target/release/claude-hub.exe`.

### Run Directly (development)

```bash
cargo run
```

## Usage

Just run the binary:

```bash
claude-hub
```

Claude Hub will automatically:
1. Scan `~/.claude/projects/` for all registered Claude Code projects
2. Load your global `~/.claude/settings.json` configuration
3. Display everything in a three-column terminal UI

### Project Mode (default)

- Use `j`/`k` to navigate projects in the sidebar
- Select a project to see its details: path, session count, last active time, CLAUDE.md status
- Press `Enter` to browse that project's conversation sessions
- Press `a` to add a new project by path (the path must contain a `.claude/` directory)
- Press `d` to remove a project from the view (does not delete actual data)

### Config Mode

- Press `Tab` to switch to Config mode
- View all your `settings.json` fields (API tokens are masked)
- Press `m` to open the model preset switcher
- Select a preset (Opus / Sonnet / Haiku / Custom) and press `Enter` to apply
- Config changes are automatically backed up to `~/.claude/backups/`

## Architecture

```
src/
├── main.rs              # Entry point, terminal init/cleanup
├── app.rs               # App state machine, key handling
├── lib.rs               # Library root (data modules)
├── config.rs            # ~/.claude/settings.json CRUD
├── project.rs           # Project scanning, path encoding
├── session.rs           # JSONL session parsing
├── history.rs           # Command history parsing
├── event.rs             # Event handling (stub)
├── keybind.rs           # Key bindings (stub)
└── ui/
    ├── mod.rs           # Layout renderer
    ├── sidebar.rs       # Project list (left column)
    ├── main_panel.rs    # Content area (center column)
    ├── detail.rs        # Preview panel (right column)
    ├── status_bar.rs    # Bottom bar
    └── help_overlay.rs  # Help popup
```

## Tech Stack

| Library | Purpose |
|---------|---------|
| [ratatui](https://github.com/ratatui/ratatui) | Terminal UI framework |
| [crossterm](https://github.com/crossterm-rs/crossterm) | Cross-platform terminal control |
| [serde](https://serde.rs/) | JSON serialization |
| [chrono](https://github.com/chronotope/chrono) | Date/time handling |
| [dirs](https://github.com/dirs-dev/directories-rs) | Platform directories |

## Development

```bash
# Build
cargo build

# Run tests
cargo test

# Run with debug output
RUST_LOG=debug cargo run

# Format code
cargo fmt

# Lint
cargo clippy
```

## License

MIT
