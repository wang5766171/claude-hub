# Contributing to Claude Hub

Thanks for your interest in contributing! This guide will help you get started.

## Development Setup

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [Rust](https://rustup.rs/) 1.77+ (MSVC toolchain on Windows)
- [Visual Studio Build Tools 2022](https://visualstudio.microsoft.com/visual-cpp-build-tools/) (Windows)

### Quick Start

```bash
# Clone the repo
git clone https://github.com/wang5766171/claude-hub.git
cd claude-hub

# Install frontend dependencies
npm install

# Start dev mode
npm run tauri dev
```

## Development Workflow

### 1. Create a Branch

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/your-bug-fix
```

Use these prefixes:
- `feature/` — new features
- `fix/` — bug fixes
- `refactor/` — code refactoring
- `docs/` — documentation changes

### 2. Make Your Changes

**Frontend** (React + TypeScript):
- Components go in `src/components/`
- Pages go in `src/pages/`
- Follow existing shadcn/ui patterns
- Use i18n for user-facing strings (`src/locales/`)

**Backend** (Rust):
- IPC commands go in `src-tauri/src/lib.rs` with `#[tauri::command]`
- Business logic in separate modules (`project.rs`, `config.rs`, etc.)
- Run `cargo fmt` and `cargo clippy` before committing

### 3. Test Your Changes

```bash
# Rust tests
cd src-tauri && cargo test

# Type check
npx tsc --noEmit

# Lint Rust code
cd src-tauri && cargo clippy
```

### 4. Commit

Write clear, concise commit messages:

```
Add session search filter
Fix config preset apply not updating UI
Update dependencies
```

### 5. Open a Pull Request

- Fill out the PR template completely
- Link related issues (`Fixes #123` or `Closes #456`)
- Keep PRs focused — one feature/fix per PR

## Code Style

### TypeScript / React
- Use functional components with hooks
- Follow existing component patterns in `src/components/`
- Use Tailwind CSS classes for styling
- Keep components small and focused

### Rust
- Follow standard Rust naming conventions
- Use `Result<T, String>` for Tauri command return types
- Add tests for new functions when possible
- Run `cargo fmt` before committing

## Project Structure

```
src-tauri/src/          # Rust backend
├── main.rs             # Entry point
├── lib.rs              # IPC command registration
├── project.rs          # Project scanning
├── config.rs           # Config management
├── session.rs          # Session parsing
├── history.rs          # History parsing
├── command.rs          # Custom commands
└── hub.rs              # App metadata

src/                    # React frontend
├── pages/              # Page components
├── components/         # UI components
│   ├── layout/         # Layout components
│   ├── projects/       # Project views
│   ├── sessions/       # Session views
│   ├── config/         # Config views
│   ├── commands/       # Command views
│   └── ui/             # Base UI (shadcn)
├── hooks/              # Custom hooks
├── types/              # Type definitions
└── lib/                # Utilities
```

## Reporting Issues

- **Bug reports**: Use the [Bug Report](https://github.com/wang5766171/claude-hub/issues/new?template=bug_report.yml) template
- **Feature requests**: Use the [Feature Request](https://github.com/wang5766171/claude-hub/issues/new?template=feature_request.yml) template
- **Questions**: Start a [Discussion](https://github.com/wang5766171/claude-hub/discussions)

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
