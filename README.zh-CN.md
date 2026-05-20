<div align="center">

# Claude Hub

**一款 [Claude Code](https://docs.anthropic.com/en/docs/claude-code) 桌面管理客户端 —— 项目、会话、配置，一目了然。**

[English](./README.md) | [中文文档](#)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Tauri v2](https://img.shields.io/badge/Tauri-v2-blue.svg)](https://v2.tauri.app/)
[![React 19](https://img.shields.io/badge/React-19-61dafb.svg)](https://react.dev/)
[![Rust](https://img.shields.io/badge/Rust-1.77+-dea584.svg)](https://www.rust-lang.org/)

[报告问题](https://github.com/wang5766171/claude-hub/issues/new?template=bug_report.yml) · [功能建议](https://github.com/wang5766171/claude-hub/issues/new?template=feature_request.yml) · [讨论区](https://github.com/wang5766171/claude-hub/discussions)

</div>

---

<p align="center">
  <img src="./docs/screenshots/projects.png" alt="项目页" width="49%" />
  <img src="./docs/screenshots/sessions.png" alt="会话页" width="49%" />
</p>

<p align="center">
  <img src="./docs/screenshots/config.png" alt="配置页" width="49%" />
</p>

> **一句话介绍** —— 如果你每天都在用 Claude Code CLI，想要一个可视化界面来管理项目、浏览会话历史、编辑配置文件，而不用手动改 JSON，这就是你要的工具。

## 为什么需要 Claude Hub？

Claude Code 很强大，但管理多个项目、翻看会话记录、手动编辑 `settings.json` 总是有点麻烦。Claude Hub 提供了**全图形化的操作界面**：

- 一眼看到所有项目
- 浏览和搜索完整对话历史
- 表单化编辑配置（告别 JSON 手误）
- 保存和切换配置预设
- 自动备份 + 一键恢复

## 功能特性

### 项目管理
- 自动发现 `~/.claude/projects/` 下的所有项目
- 显示会话数、最后活跃时间、CLAUDE.md 状态
- 通过文件夹选择器添加/移除项目

### 会话浏览
- 按项目筛选会话
- 查看完整对话内容，支持语法高亮
- 自定义会话名称，方便管理

### 配置编辑
- 可视化表单编辑 `settings.json`
- 模型下拉选择器
- 环境变量键值对编辑器
- 插件开关列表
- 配置导入/导出为 JSON 文件

### 配置预设
- 保存当前配置为命名预设
- 一键应用预设，快速切换配置组合
- 管理多个预设，适配不同工作流

### 备份恢复
- 每次保存配置自动创建备份
- 浏览带时间戳的备份历史
- 一键恢复到任意历史版本

### 自定义命令
- 创建和管理自定义斜杠命令
- 直接在 GUI 中执行命令

## 技术栈

| 层 | 技术 |
|----|------|
| 桌面框架 | [Tauri v2](https://v2.tauri.app/) |
| 前端 | [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) |
| UI 组件 | [shadcn/ui](https://ui.shadcn.com/) + [Tailwind CSS v4](https://tailwindcss.com/) |
| 后端 | [Rust](https://www.rust-lang.org/) |
| 构建工具 | [Vite](https://vitejs.dev/) + [Cargo](https://doc.rust-lang.org/cargo/) |
| 国际化 | [i18next](https://www.i18next.com/)（中英文） |

## 快速开始

### 环境要求

| 软件 | 最低版本 | 用途 |
|------|----------|------|
| [Node.js](https://nodejs.org/) | 18+ | 前端构建 |
| [Rust](https://rustup.rs/) | 1.77+ | 后端编译 |
| [VS Build Tools 2022](https://visualstudio.microsoft.com/visual-cpp-build-tools/) | 最新 | Windows C++ 编译工具链 |

### 安装步骤（Windows）

**1. 安装 Rust**

前往 [rustup.rs](https://rustup.rs/) 下载并运行 `rustup-init.exe`。

```bash
rustup default stable-x86_64-pc-windows-msvc
```

**2. 安装 Node.js**

```bash
winget install OpenJS.NodeJS.LTS
```

**3. 安装 Visual Studio Build Tools**

```bash
winget install Microsoft.VisualStudio.2022.BuildTools --override "--add Microsoft.VisualStudio.Workload.VCTools --includeRecommended --passive"
```

安装完成后需**重启终端**。

**4. 验证环境**

```bash
rustc --version && node --version && npm --version
```

### 构建与运行

```bash
# 安装依赖
npm install

# 开发模式（热重载）
npm run tauri dev

# 生产构建（.exe 安装包）
npm run tauri build
```

构建产物位于 `src-tauri/target/release/bundle/`（MSI + NSIS 安装包）。

### 运行测试

```bash
cd src-tauri && cargo test
```

## 项目结构

```
src-tauri/src/
├── main.rs          # Tauri 入口
├── lib.rs           # IPC 命令注册
├── project.rs       # 项目扫描、路径编码
├── config.rs        # 配置读写、备份、导入导出
├── session.rs       # JSONL 会话解析
├── history.rs       # 命令历史解析
├── command.rs       # 自定义命令管理
└── hub.rs           # ~/.claude-hub/ 元数据

src/
├── App.tsx          # 应用入口、页面路由
├── pages/           # 页面组件
├── components/
│   ├── layout/      # 布局（侧边栏、状态栏）
│   ├── projects/    # 项目相关组件
│   ├── sessions/    # 会话相关组件
│   ├── config/      # 配置编辑、预设、备份
│   ├── commands/    # 自定义命令界面
│   └── ui/          # shadcn/ui 基础组件
├── hooks/           # 自定义 Hooks
├── types/           # TypeScript 类型定义
└── lib/             # 工具函数
```

## 数据存储

| 路径 | 说明 |
|------|------|
| `~/.claude/projects/` | Claude Code 项目数据（只读） |
| `~/.claude/settings.json` | 全局配置（读写） |
| `~/.claude/backups/` | 配置备份文件 |
| `~/.claude-hub/presets.json` | 自定义配置预设 |
| `~/.claude-hub/sessions.json` | 会话名称映射 |

## 参与贡献

欢迎贡献！请参阅 [CONTRIBUTING.md](./CONTRIBUTING.md) 了解贡献指南。

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 发起 Pull Request

## 许可证

本项目基于 MIT 许可证开源 - 详见 [LICENSE](LICENSE) 文件。

## 致谢

- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) by Anthropic
- [Tauri](https://tauri.app/) — Rust + Web 构建桌面应用
- [shadcn/ui](https://ui.shadcn.com/) — 美观且无障碍的 UI 组件
