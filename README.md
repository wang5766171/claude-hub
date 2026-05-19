# Claude Hub

一款用于管理 [Claude Code](https://docs.anthropic.com/en/docs/claude-code) 项目、会话和配置的桌面客户端。

基于 Tauri v2 构建，打包为独立 .exe，支持鼠标操作，无需命令行。

## 功能特性

- **项目管理** — 自动发现 `~/.claude/projects/` 下的所有项目，显示会话数、最后活跃时间、CLAUDE.md 状态
- **会话浏览** — 按项目筛选会话，查看完整对话内容，支持自定义会话名称
- **配置编辑** — 可视化编辑 `settings.json`：切换模型、修改环境变量、开关插件
- **配置预设** — 保存当前配置为预设套餐，一键切换不同配置组合
- **备份恢复** — 每次保存配置自动创建备份，可一键恢复到任意历史版本
- **导入导出** — 将配置导出为 JSON 文件，或从文件导入
- **项目添加** — 通过文件夹选择器添加新项目，自动关联 Claude 项目数据

## 环境要求

### 必装软件

| 软件 | 最低版本 | 说明 |
|------|----------|------|
| [Node.js](https://nodejs.org/) | 18+ | 前端构建 |
| [Rust](https://rustup.rs/) | 1.77+ | 后端编译 |
| [Visual Studio Build Tools 2022](https://visualstudio.microsoft.com/visual-cpp-build-tools/) | 最新 | Windows C++ 编译工具链 |

### 安装步骤（Windows）

**1. 安装 Rust**

前往 [rustup.rs](https://rustup.rs/) 下载并运行 `rustup-init.exe`，按提示完成安装。

安装完成后切换到 MSVC 工具链：

```bash
rustup default stable-x86_64-pc-windows-msvc
```

**2. 安装 Node.js**

前往 [nodejs.org](https://nodejs.org/) 下载 LTS 版本安装，或使用包管理器：

```bash
winget install OpenJS.NodeJS.LTS
```

**3. 安装 Visual Studio Build Tools 2022**

需要安装 "使用 C++ 的桌面开发" 工作负载：

```bash
winget install Microsoft.VisualStudio.2022.BuildTools --override "--add Microsoft.VisualStudio.Workload.VCTools --includeRecommended --passive"
```

安装完成后需**重启终端**，确保 `link.exe` 在 PATH 中。

**4. 验证环境**

```bash
rustc --version
node --version
npm --version
```

三条命令均有输出版本号即为就绪。

## 构建与运行

### 安装前端依赖

```bash
npm install
```

### 开发模式

启动开发服务器，支持热重载：

```bash
npm run tauri dev
```

首次启动会编译 Rust 后端，耗时较长（约 1-3 分钟），后续启动会快很多。

### 生产构建

打包为 .exe 安装程序：

```bash
npm run tauri build
```

构建产物位于 `src-tauri/target/release/bundle/`，包含：
- `msi/` — Windows Installer 安装包
- `nsis/` — NSIS 安装包

### 仅构建前端

```bash
npm run build
```

### 运行后端测试

```bash
cd src-tauri && cargo test
```

## 使用说明

启动应用后会自动扫描 `~/.claude/` 目录，无需额外配置。

### 项目页

- 卡片式展示所有 Claude Code 项目
- 点击卡片查看项目详情（路径、会话数、最后活跃时间）
- 点击「Add Project」通过文件夹选择器添加新项目
- 点击「View Sessions」跳转到该项目会话列表

### 会话页

- 左侧项目筛选器（仅显示有会话的项目）
- 中间会话列表，点击查看完整对话
- 会话支持自定义命名（右键菜单或编辑按钮）

### 配置页

- **Edit Config** 标签页：结构化表单编辑所有配置字段
  - Model：下拉选择模型
  - Environment Variables：键值对表格，支持增删改
  - Enabled Plugins：开关列表
  - Skip Dangerous：开关控制
- **Presets** 标签页：保存和应用配置预设
- **Backups** 标签页：查看备份历史，一键恢复
- 顶部 Export/Import 按钮支持配置导入导出

## 数据存储

应用数据存储位置：

| 路径 | 说明 |
|------|------|
| `~/.claude/projects/` | Claude Code 项目数据（只读） |
| `~/.claude/settings.json` | Claude Code 全局配置（读写） |
| `~/.claude/backups/` | 配置备份文件 |
| `~/.claude-hub/presets.json` | 自定义配置预设 |
| `~/.claude-hub/sessions.json` | 会话自定义名称映射 |

应用仅读写上述目录，不会修改 Claude Code 的其他文件。

## 技术栈

| 层 | 技术 |
|----|------|
| 桌面框架 | Tauri v2 |
| 前端 | React 19 + TypeScript |
| UI 组件 | shadcn/ui + Tailwind CSS v4 |
| 后端 | Rust |
| 构建工具 | Vite + Cargo |

## 项目结构

```
src-tauri/src/          # Rust 后端
├── main.rs             # Tauri 入口
├── lib.rs              # IPC 命令注册
├── project.rs          # 项目扫描、路径编码
├── config.rs           # 配置读写、备份、导入导出
├── session.rs          # JSONL 会话解析
├── history.rs          # 命令历史解析
└── hub.rs              # ~/.claude-hub/ 元数据管理

src/                    # React 前端
├── App.tsx             # 应用入口、页面路由
├── pages/              # 页面组件
├── components/
│   ├── layout/         # 布局（侧边栏、状态栏）
│   ├── projects/       # 项目相关组件
│   ├── sessions/       # 会话相关组件
│   ├── config/         # 配置相关组件
│   └── ui/             # shadcn/ui 基础组件
├── hooks/              # 自定义 Hooks
├── types/              # TypeScript 类型定义
└── lib/                # 工具函数
```

## 开发

```bash
# 类型检查
npx tsc --noEmit

# Rust 检查
cd src-tauri && cargo clippy

# 格式化 Rust 代码
cd src-tauri && cargo fmt

# 运行测试
cd src-tauri && cargo test
```

## License

MIT
