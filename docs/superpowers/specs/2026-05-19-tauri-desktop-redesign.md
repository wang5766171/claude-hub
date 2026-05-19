# Claude Hub - Tauri 桌面客户端重构设计

日期：2026-05-19

## 背景

claude-hub 原为 ratatui TUI 终端应用，交互体验受限于终端面板。重构为 Tauri v2 桌面客户端，保留现有 Rust 后端模块的核心逻辑，用 React + shadcn/ui 重做界面，打包为独立 .exe。

## 技术栈

| 层 | 技术 | 说明 |
|---|---|---|
| 桌面框架 | Tauri v2 | Rust 后端 + WebView 前端，打包 .exe ~5-10MB |
| 前端框架 | React + TypeScript | SPA |
| UI 组件库 | shadcn/ui | 轻量可定制，桌面风格适配好 |
| 样式 | Tailwind CSS | 与 shadcn/ui 搭配 |
| 构建工具 | Vite | Tauri 默认集成 |
| 后端语言 | Rust | 复用现有模块 |

## 数据存储

```
~/.claude-hub/
├── sessions.json      # 会话自定义名称映射 {session_id: custom_name}
├── presets.json        # 配置预设套餐
├── commands.json       # 自定义快捷命令列表
└── state.json          # 运行时状态（最后选中项目、视图偏好等）
```

所有文件惰性创建，首次使用对应功能时才写入。不修改 Claude Code 原生文件。

## 架构

```
┌─────────────────────────────────────────┐
│  claude-hub.exe (Tauri 桌面客户端)       │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │  前端 (React + shadcn/ui)         │  │
│  │  - 左侧导航 + 右侧内容区布局      │  │
│  │  - 鼠标点击、右键菜单、拖拽        │  │
│  └─────────────┬─────────────────────┘  │
│                │ Tauri IPC (invoke)      │
│  ┌─────────────▼─────────────────────┐  │
│  │  后端 (Rust)                       │  │
│  │  复用模块：                         │  │
│  │  - project.rs (项目扫描、路径编码)  │  │
│  │  - config.rs  (配置读写、备份)      │  │
│  │  - session.rs (JSONL 会话解析)      │  │
│  │  - history.rs (历史记录解析)        │  │
│  │  新增模块：                         │  │
│  │  - hub.rs     (claude-hub 元数据)   │  │
│  │  - command.rs (快捷命令执行)        │  │
│  └────────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

## UI 设计

### 整体布局

左侧固定导航栏（图标+文字）+ 右侧内容区。底部状态栏显示当前模型、项目数、会话数。

导航项：
1. 项目 (Projects)
2. 会话 (Sessions)
3. 配置 (Config)
4. 命令 (Commands)

### 项目页

- 卡片式项目列表，每个卡片显示：名称、路径、会话数、最后活跃时间、CLAUDE.md 状态标记
- 顶部「添加项目」按钮，点击弹出路径选择对话框
- 点击项目卡片 → 右侧滑入详情面板：项目配置内容、快捷操作按钮
- 右键菜单：打开文件夹、复制路径、移除

### 会话页

- 左侧项目筛选器（仅显示有会话的项目）
- 中间会话列表：自定义名称（或 ID 前 8 位）、消息数、时间
- 点击会话 → 右侧展示完整对话内容，支持滚动、搜索、复制单条消息
- 右键菜单：重命名、删除自定义名称、复制 Session ID

### 配置页

- 结构化表单编辑所有字段：
  - model：下拉选择
  - env：键值对表格（增删改）
  - enabledPlugins：开关列表
  - skipDangerous：开关
- 预设管理区：创建/切换/删除预设套餐（每套包含完整配置快照）
- 备份历史列表：时间戳 → 一键恢复
- 导入/导出按钮

### 命令页

- 常用命令列表（内置 + 用户自定义）
- 点击命令 → 确认弹窗 → 临时打开终端执行 → 完成后回到应用
- 支持添加自定义命令模板（名称 + 命令 + 适用项目路径）

## IPC 命令接口

### 项目管理

| 命令 | 输入 | 输出 |
|------|------|------|
| `scan_projects` | 无 | `Vec<Project>` |
| `add_project` | `{path: String}` | `Result<Project>` |
| `remove_project` | `{encoded_name: String}` | `Result<()>` |
| `get_project_detail` | `{encoded_name: String}` | `ProjectDetail` |

### 会话管理

| 命令 | 输入 | 输出 |
|------|------|------|
| `list_sessions` | `{encoded_name: String}` | `Vec<Session>` |
| `get_session_messages` | `{session_id: String}` | `Vec<Message>` |
| `rename_session` | `{session_id, name}` | `Result<()>` |
| `delete_session_name` | `{session_id}` | `Result<()>` |

### 配置管理

| 命令 | 输入 | 输出 |
|------|------|------|
| `load_config` | 无 | `ClaudeConfig` |
| `save_config` | `{config: ClaudeConfig}` | `Result<()>` |
| `list_presets` | 无 | `Vec<Preset>` |
| `save_preset` | `{preset: Preset}` | `Result<()>` |
| `apply_preset` | `{preset_id: String}` | `Result<()>` |
| `delete_preset` | `{preset_id: String}` | `Result<()>` |
| `list_backups` | 无 | `Vec<BackupEntry>` |
| `restore_backup` | `{backup_name: String}` | `Result<()>` |
| `export_config` | `{path: String}` | `Result<()>` |
| `import_config` | `{path: String}` | `Result<ClaudeConfig>` |

### 命令执行

| 命令 | 输入 | 输出 |
|------|------|------|
| `execute_command` | `{command: String, cwd: Option<String>}` | `Result<Output>` |
| `list_custom_commands` | 无 | `Vec<CustomCommand>` |
| `save_custom_command` | `{cmd: CustomCommand}` | `Result<()>` |

## 实施批次

### P1：项目脚手架 + 会话管理

目标：Tauri 项目搭建完成，项目页和会话页可用。

1. 初始化 Tauri v2 + React + TypeScript + Vite 项目
2. 配置 shadcn/ui + Tailwind CSS
3. 迁移 Rust 后端模块（project.rs, session.rs, history.rs, config.rs），去掉 ratatui/crossterm 依赖
4. 新增 hub.rs（~/.claude-hub/ 元数据管理）
5. 实现 IPC 命令层（scan_projects, list_sessions, get_session_messages, rename_session 等）
6. 实现前端项目页（卡片列表、添加项目、项目详情）
7. 实现前端会话页（两级导航：会话列表 → 消息详情，自定义命名）
8. 删除旧的 src/ui/、src/event.rs、src/keybind.rs、src/app.rs、src/main.rs

### P2：配置管理

目标：完整的配置编辑、预设、备份恢复、导入导出。

1. 扩展 config.rs（预设 CRUD、导入导出、备份列表）
2. 实现 IPC 命令（save_config, list_presets, apply_preset, list_backups, restore_backup, export/import）
3. 实现前端配置页（结构化表单、预设管理区、备份历史、导入导出按钮）

### P3：快捷命令

目标：命令启动器可用。

1. 新增 command.rs（命令执行引擎）
2. 实现 IPC 命令（execute_command, list/save_custom_commands）
3. 实现前端命令页（命令列表、执行确认弹窗、自定义命令编辑）

### P4：体验打磨

目标：稳定性和细节。

1. 数据刷新机制（定时轮询或手动刷新按钮）
2. 错误处理与用户提示（Toast 通知）
3. 窗口状态持久化（大小、位置、最后选中页）
4. 系统托盘支持（最小化到托盘）
5. 清理 graphify-out/ 和旧 TUI 相关的 git hooks

## 代码迁移策略

复用原则：保留核心数据解析逻辑，去掉所有 UI 相关代码。

### 直接复用的文件

- `src/project.rs` — scan_projects, encode/decode_path, add_project — 删除 ratatui 相关类型引用
- `src/config.rs` — load/save/backup/restore, ClaudeConfig 结构体 — 扩展预设/导入导出方法
- `src/session.rs` — parse_message, load_session, Session/Message 结构体
- `src/history.rs` — load_history, parse_history_file, HistoryEntry 结构体

### 删除的文件

- `src/ui/` (整个目录)
- `src/event.rs` (stub)
- `src/keybind.rs` (stub)
- `src/app.rs` (TUI 状态机)
- `src/main.rs` (TUI 事件循环)
- `src/lib.rs` (旧模块注册)

### 新增的文件

- `src-tauri/src/main.rs` — Tauri 入口
- `src-tauri/src/commands/` — IPC 命令注册
- `src-tauri/src/hub.rs` — claude-hub 元数据管理
- `src-tauri/src/command.rs` — 命令执行
- `src/` (前端目录) — React 应用

### Cargo.toml 变更

- 移除：ratatui, crossterm
- 新增：tauri, tauri-build
- 保留：serde, serde_json, chrono, dirs

## 验收标准

- P1：双击 .exe 打开桌面窗口，项目列表正确显示，点击项目可查看会话，会话支持重命名
- P2：配置表单可编辑所有字段，预设可创建和切换，备份可恢复，配置可导入导出
- P3：命令列表可点击执行，自定义命令可添加
- P4：应用稳定运行，窗口状态可持久化，错误有友好提示
