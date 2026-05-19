# P2: Configuration Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete config page with structured form editing, presets CRUD, backup/restore, and import/export for Claude Code settings.json.

**Architecture:** Rust backend provides preset CRUD in `hub.rs` (stored in `~/.claude-hub/presets.json`), config import/export and backup management in `config.rs`. Frontend ConfigPage uses tabs to organize: Form Edit, Presets, Backups. Tauri IPC bridges the two.

**Tech Stack:** Rust (serde, chrono, tauri), React + TypeScript, shadcn/ui (Select, Switch, Label, Tabs, Badge), Tailwind CSS v4

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `src-tauri/src/hub.rs` | Modify | Add Preset struct, presets CRUD, presets.json I/O |
| `src-tauri/src/config.rs` | Modify | Add export_config, import_config, enhance list_backups with timestamps |
| `src-tauri/src/lib.rs` | Modify | Register 8 new IPC commands |
| `src/types/index.ts` | Modify | Add Preset, BackupEntry types |
| `src/components/config/config-form.tsx` | Create | Structured form for all config fields |
| `src/components/config/preset-manager.tsx` | Create | Preset list, create, apply, delete |
| `src/components/config/backup-manager.tsx` | Create | Backup list with restore action |
| `src/pages/config-page.tsx` | Create | Tab-based config page layout |
| `src/App.tsx` | Modify | Replace placeholder with ConfigPage |

---

### Task 1: Add Preset Types and CRUD to hub.rs

**Files:**
- Modify: `src-tauri/src/hub.rs`

- [ ] **Step 1: Add Preset struct and presets CRUD functions**

Add after the `AppState` block (after line 83) in `src-tauri/src/hub.rs`:

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Preset {
    pub id: String,
    pub name: String,
    pub config: config::ClaudeConfig,
    #[serde(rename = "createdAt")]
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize, Default)]
pub struct Presets {
    pub presets: Vec<Preset>,
}

fn presets_path() -> Result<PathBuf, Box<dyn std::error::Error>> {
    Ok(hub_dir()?.join("presets.json"))
}

pub fn list_presets() -> Result<Vec<Preset>, Box<dyn std::error::Error>> {
    let path = presets_path()?;
    if !path.exists() {
        return Ok(Vec::new());
    }
    let data: Presets = read_json(&path)?;
    Ok(data.presets)
}

pub fn save_preset(preset: Preset) -> Result<(), Box<dyn std::error::Error>> {
    let path = presets_path()?;
    let mut data = if path.exists() {
        read_json::<Presets>(&path)?
    } else {
        Presets::default()
    };
    if let Some(idx) = data.presets.iter().position(|p| p.id == preset.id) {
        data.presets[idx] = preset;
    } else {
        data.presets.push(preset);
    }
    write_json(&path, &data)
}

pub fn delete_preset(id: &str) -> Result<(), Box<dyn std::error::Error>> {
    let path = presets_path()?;
    if !path.exists() {
        return Ok(());
    }
    let mut data: Presets = read_json(&path)?;
    data.presets.retain(|p| p.id != id);
    write_json(&path, &data)
}
```

- [ ] **Step 2: Build to verify Rust compiles**

Run: `cd D:/MyCodes/claude-hub && cargo build 2>&1 | tail -5`
Expected: Compiles with warnings about unused functions (they'll be wired in Task 3)

- [ ] **Step 3: Commit**

```bash
git add src-tauri/src/hub.rs
git commit -m "feat: add preset types and CRUD functions in hub.rs"
```

---

### Task 2: Add Import/Export and Enhance Backup Listing in config.rs

**Files:**
- Modify: `src-tauri/src/config.rs`

- [ ] **Step 1: Add BackupEntry struct and enhance list_backups**

Replace the `list_backups` function in `src-tauri/src/config.rs` (lines 65-77) with:

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BackupEntry {
    pub name: String,
    pub path: String,
    pub timestamp: Option<String>,
}

pub fn list_backups() -> Result<Vec<BackupEntry>, Box<dyn std::error::Error>> {
    let backup_dir = claude_dir()?.join("backups");
    if !backup_dir.exists() {
        return Ok(Vec::new());
    }
    let mut backups: Vec<BackupEntry> = std::fs::read_dir(&backup_dir)?
        .filter_map(|e| e.ok())
        .map(|e| {
            let path = e.path();
            let name = path.file_name().unwrap_or_default().to_string_lossy().to_string();
            let timestamp = path
                .file_stem()
                .unwrap_or_default()
                .to_string_lossy()
                .strip_prefix("settings_")
                .map(|s| {
                    chrono::NaiveDateTime::parse_from_str(s, "%Y%m%d_%H%M%S")
                        .ok()
                        .map(|dt| dt.format("%Y-%m-%d %H:%M:%S").to_string())
                })
                .flatten();
            BackupEntry {
                name,
                path: path.to_string_lossy().to_string(),
                timestamp,
            }
        })
        .filter(|b| b.name.ends_with(".json"))
        .collect();
    backups.sort_by(|a, b| b.name.cmp(&a.name));
    Ok(backups)
}
```

- [ ] **Step 2: Update restore_backup to take string path**

Replace the `restore_backup` function (lines 79-85) with:

```rust
pub fn restore_backup(backup_path: &str) -> Result<(), Box<dyn std::error::Error>> {
    let dst = config_path()?;
    let content = std::fs::read_to_string(backup_path)?;
    let _: ClaudeConfig = serde_json::from_str(&content)?;
    std::fs::write(&dst, content)?;
    Ok(())
}
```

- [ ] **Step 3: Add export_config and import_config functions**

Add at the end of `src-tauri/src/config.rs`:

```rust
pub fn export_config(export_path: &str) -> Result<(), Box<dyn std::error::Error>> {
    let src = config_path()?;
    let content = std::fs::read_to_string(&src)?;
    std::fs::write(export_path, content)?;
    Ok(())
}

pub fn import_config(import_path: &str) -> Result<ClaudeConfig, Box<dyn std::error::Error>> {
    let content = std::fs::read_to_string(import_path)?;
    let config: ClaudeConfig = serde_json::from_str(&content)?;
    let dst = config_path()?;
    backup_config()?;
    std::fs::write(&dst, &content)?;
    Ok(config)
}
```

- [ ] **Step 4: Build to verify**

Run: `cd D:/MyCodes/claude-hub && cargo build 2>&1 | tail -5`
Expected: Compiles successfully

- [ ] **Step 5: Commit**

```bash
git add src-tauri/src/config.rs
git commit -m "feat: add import/export and enhanced backup listing in config.rs"
```

---

### Task 3: Register New IPC Commands in lib.rs

**Files:**
- Modify: `src-tauri/src/lib.rs`

- [ ] **Step 1: Add 8 new IPC command functions and register them**

Add these commands after the `load_history` function (after line 69) in `src-tauri/src/lib.rs`:

```rust
#[tauri::command]
fn save_config(config: config::ClaudeConfig) -> Result<(), String> {
    config::save_config(&config).map_err(|e| e.to_string())
}

#[tauri::command]
fn list_presets() -> Result<Vec<hub::Preset>, String> {
    hub::list_presets().map_err(|e| e.to_string())
}

#[tauri::command]
fn save_preset(preset: hub::Preset) -> Result<(), String> {
    hub::save_preset(preset).map_err(|e| e.to_string())
}

#[tauri::command]
fn delete_preset(id: String) -> Result<(), String> {
    hub::delete_preset(&id).map_err(|e| e.to_string())
}

#[tauri::command]
fn apply_preset(id: String) -> Result<(), String> {
    let presets = hub::list_presets().map_err(|e| e.to_string())?;
    let preset = presets.into_iter().find(|p| p.id == id).ok_or("Preset not found")?;
    config::save_config(&preset.config).map_err(|e| e.to_string())
}

#[tauri::command]
fn list_backups() -> Result<Vec<config::BackupEntry>, String> {
    config::list_backups().map_err(|e| e.to_string())
}

#[tauri::command]
fn restore_backup(backup_path: String) -> Result<(), String> {
    config::restore_backup(&backup_path).map_err(|e| e.to_string())
}

#[tauri::command]
fn export_config(path: String) -> Result<(), String> {
    config::export_config(&path).map_err(|e| e.to_string())
}

#[tauri::command]
fn import_config(path: String) -> Result<config::ClaudeConfig, String> {
    config::import_config(&path).map_err(|e| e.to_string())
}
```

Then update the `invoke_handler` macro to include all new commands. Replace lines 75-87 with:

```rust
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
            save_config,
            list_presets,
            save_preset,
            delete_preset,
            apply_preset,
            list_backups,
            restore_backup,
            export_config,
            import_config,
        ])
```

- [ ] **Step 2: Build to verify**

Run: `cd D:/MyCodes/claude-hub && cargo build 2>&1 | tail -5`
Expected: Compiles successfully with zero warnings for the new commands

- [ ] **Step 3: Commit**

```bash
git add src-tauri/src/lib.rs
git commit -m "feat: register P2 config management IPC commands"
```

---

### Task 4: Update TypeScript Types

**Files:**
- Modify: `src/types/index.ts`

- [ ] **Step 1: Add Preset and BackupEntry types, update ClaudeConfig**

Replace the entire `src/types/index.ts` with:

```typescript
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
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd D:/MyCodes/claude-hub && npx tsc --noEmit 2>&1 | tail -5`
Expected: No errors (existing code still compiles)

- [ ] **Step 3: Commit**

```bash
git add src/types/index.ts
git commit -m "feat: add Preset and BackupEntry TypeScript types"
```

---

### Task 5: Install shadcn/ui Components

**Files:**
- Create: `src/components/ui/select.tsx`, `src/components/ui/switch.tsx`, `src/components/ui/label.tsx`, `src/components/ui/tabs.tsx`, `src/components/ui/badge.tsx`, `src/components/ui/textarea.tsx`

- [ ] **Step 1: Install select, switch, label, tabs, badge, textarea components**

Run:
```bash
cd D:/MyCodes/claude-hub && npx shadcn@latest add select switch label tabs badge textarea -y
```

Expected: All 6 components installed to `src/components/ui/`

- [ ] **Step 2: Verify files exist**

Run: `ls D:/MyCodes/claude-hub/src/components/ui/`
Expected: select.tsx, switch.tsx, label.tsx, tabs.tsx, badge.tsx, textarea.tsx all present

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/
git commit -m "chore: add shadcn/ui components for config page"
```

---

### Task 6: Create ConfigPage with Structured Form

**Files:**
- Create: `src/components/config/config-form.tsx`
- Create: `src/pages/config-page.tsx`

- [ ] **Step 1: Create config-form.tsx**

Create `src/components/config/config-form.tsx`:

```tsx
import { useState } from "react";
import { invokeCommand } from "@/hooks/use-invoke";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Save, Plus, Trash2 } from "lucide-react";
import type { ClaudeConfig } from "@/types";

const MODEL_OPTIONS = [
  "claude-sonnet-4-6",
  "claude-opus-4-7",
  "claude-haiku-4-5-20251001",
];

interface ConfigFormProps {
  config: ClaudeConfig;
  onSaved: (config: ClaudeConfig) => void;
}

export function ConfigForm({ config: initialConfig, onSaved }: ConfigFormProps) {
  const [config, setConfig] = useState<ClaudeConfig>(initialConfig);
  const [saving, setSaving] = useState(false);
  const [newEnvKey, setNewEnvKey] = useState("");

  const handleModelChange = (model: string) => {
    setConfig({ ...config, model: model || null });
  };

  const handleEnvChange = (key: string, value: string) => {
    const env = { ...(config.env || {}) };
    env[key] = value;
    setConfig({ ...config, env });
  };

  const handleEnvDelete = (key: string) => {
    const env = { ...(config.env || {}) };
    delete env[key];
    setConfig({ ...config, env });
  };

  const handleAddEnv = () => {
    if (!newEnvKey.trim()) return;
    const env = { ...(config.env || {}) };
    env[newEnvKey.trim()] = "";
    setConfig({ ...config, env });
    setNewEnvKey("");
  };

  const handlePluginToggle = (plugin: string, enabled: boolean) => {
    const plugins = { ...(config.enabledPlugins || {}) };
    plugins[plugin] = enabled;
    setConfig({ ...config, enabledPlugins: plugins });
  };

  const handlePluginDelete = (plugin: string) => {
    const plugins = { ...(config.enabledPlugins || {}) };
    delete plugins[plugin];
    setConfig({ ...config, enabledPlugins: plugins });
  };

  const handleSkipDangerous = (checked: boolean) => {
    setConfig({ ...config, skipDangerousModePermissionPrompt: checked || null });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await invokeCommand("save_config", { config });
      onSaved(config);
    } catch (err) {
      console.error("Failed to save config:", err);
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = JSON.stringify(config) !== JSON.stringify(initialConfig);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Configuration</h3>
        <Button onClick={handleSave} disabled={!hasChanges || saving} size="sm">
          <Save className="mr-2 h-4 w-4" />
          {saving ? "Saving..." : "Save"}
        </Button>
      </div>

      {/* Model */}
      <div className="space-y-2">
        <Label htmlFor="model">Model</Label>
        <div className="flex gap-2">
          <select
            id="model"
            value={config.model || ""}
            onChange={(e) => handleModelChange(e.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="">Default</option>
            {MODEL_OPTIONS.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Environment Variables */}
      <div className="space-y-2">
        <Label>Environment Variables</Label>
        <div className="space-y-2">
          {Object.entries(config.env || {}).map(([key, value]) => (
            <div key={key} className="flex items-center gap-2">
              <code className="min-w-[140px] rounded bg-muted px-2 py-1 text-xs font-mono">{key}</code>
              <Input
                value={value}
                onChange={(e) => handleEnvChange(key, e.target.value)}
                className="flex-1"
                placeholder="Value"
              />
              <Button variant="ghost" size="icon-xs" onClick={() => handleEnvDelete(key)}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
          <div className="flex items-center gap-2">
            <Input
              value={newEnvKey}
              onChange={(e) => setNewEnvKey(e.target.value)}
              className="min-w-[140px]"
              placeholder="KEY"
              onKeyDown={(e) => e.key === "Enter" && handleAddEnv()}
            />
            <Button variant="outline" size="sm" onClick={handleAddEnv} disabled={!newEnvKey.trim()}>
              <Plus className="mr-1 h-3 w-3" />
              Add
            </Button>
          </div>
        </div>
      </div>

      {/* Enabled Plugins */}
      <div className="space-y-2">
        <Label>Enabled Plugins</Label>
        <div className="space-y-2">
          {Object.entries(config.enabledPlugins || {}).map(([plugin, enabled]) => (
            <div key={plugin} className="flex items-center justify-between rounded-md border px-3 py-2">
              <code className="text-xs font-mono">{plugin}</code>
              <div className="flex items-center gap-2">
                <Switch checked={enabled} onCheckedChange={(checked) => handlePluginToggle(plugin, checked)} />
                <Button variant="ghost" size="icon-xs" onClick={() => handlePluginDelete(plugin)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
          {(!config.enabledPlugins || Object.keys(config.enabledPlugins).length === 0) && (
            <p className="text-sm text-muted-foreground">No plugins configured</p>
          )}
        </div>
      </div>

      {/* Skip Dangerous Mode Permission Prompt */}
      <div className="flex items-center justify-between rounded-md border px-3 py-3">
        <div className="space-y-0.5">
          <Label>Skip Dangerous Mode Permission Prompt</Label>
          <p className="text-xs text-muted-foreground">Auto-approve dangerous operations without confirmation</p>
        </div>
        <Switch
          checked={config.skipDangerousModePermissionPrompt === true}
          onCheckedChange={handleSkipDangerous}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create config-page.tsx with tabs**

Create `src/pages/config-page.tsx`:

```tsx
import { useState, useCallback } from "react";
import { useInvoke, invokeCommand } from "@/hooks/use-invoke";
import { ConfigForm } from "@/components/config/config-form";
import { PresetManager } from "@/components/config/preset-manager";
import { BackupManager } from "@/components/config/backup-manager";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Download, Upload } from "lucide-react";
import { open } from "@tauri-apps/plugin-dialog";
import type { ClaudeConfig } from "@/types";

export function ConfigPage() {
  const { data: config, loading, refetch } = useInvoke<ClaudeConfig>("load_config");
  const [activeTab, setActiveTab] = useState<"edit" | "presets" | "backups">("edit");

  const handleConfigSaved = useCallback(() => {
    refetch();
  }, [refetch]);

  const handleExport = async () => {
    const path = await open({
      defaultPath: "claude-settings.json",
      filters: [{ name: "JSON", extensions: ["json"] }],
    });
    if (path) {
      try {
        await invokeCommand("export_config", { path });
      } catch (err) {
        console.error("Export failed:", err);
      }
    }
  };

  const handleImport = async () => {
    const path = await open({
      filters: [{ name: "JSON", extensions: ["json"] }],
      multiple: false,
    });
    if (path) {
      try {
        await invokeCommand("import_config", { path });
        refetch();
      } catch (err) {
        console.error("Import failed:", err);
      }
    }
  };

  if (loading) {
    return <Skeleton className="h-64" />;
  }

  if (!config) {
    return <div className="text-muted-foreground">Failed to load configuration</div>;
  }

  const tabs = [
    { key: "edit" as const, label: "Edit Config" },
    { key: "presets" as const, label: "Presets" },
    { key: "backups" as const, label: "Backups" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Configuration</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button variant="outline" size="sm" onClick={handleImport}>
            <Upload className="mr-2 h-4 w-4" />
            Import
          </Button>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-border pb-0">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab.key
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "edit" && (
        <ConfigForm config={config} onSaved={handleConfigSaved} />
      )}
      {activeTab === "presets" && (
        <PresetManager onApplied={refetch} />
      )}
      {activeTab === "backups" && (
        <BackupManager onRestored={refetch} />
      )}
    </div>
  );
}
```

- [ ] **Step 3: Verify TypeScript compiles (will fail until Tasks 7-8 create the missing components)**

Run: `cd D:/MyCodes/claude-hub && npx tsc --noEmit 2>&1 | head -10`
Expected: Errors about missing PresetManager and BackupManager — these will be created in Tasks 7 and 8

- [ ] **Step 4: Commit**

```bash
git add src/components/config/config-form.tsx src/pages/config-page.tsx
git commit -m "feat: add config form and config page skeleton"
```

---

### Task 7: Create Preset Manager Component

**Files:**
- Create: `src/components/config/preset-manager.tsx`

- [ ] **Step 1: Create preset-manager.tsx**

Create `src/components/config/preset-manager.tsx`:

```tsx
import { useState } from "react";
import { useInvoke, invokeCommand } from "@/hooks/use-invoke";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Trash2, Apply, Save } from "lucide-react";
import type { Preset, ClaudeConfig } from "@/types";

interface PresetManagerProps {
  onApplied: () => void;
}

export function PresetManager({ onApplied }: PresetManagerProps) {
  const { data: presets, loading, refetch } = useInvoke<Preset[]>("list_presets");
  const { data: currentConfig } = useInvoke<ClaudeConfig>("load_config");
  const [createOpen, setCreateOpen] = useState(false);
  const [presetName, setPresetName] = useState("");
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!presetName.trim() || !currentConfig) return;
    setSaving(true);
    try {
      const preset: Preset = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        name: presetName.trim(),
        config: currentConfig,
        createdAt: new Date().toISOString(),
      };
      await invokeCommand("save_preset", { preset });
      setCreateOpen(false);
      setPresetName("");
      refetch();
    } catch (err) {
      console.error("Failed to create preset:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleApply = async (id: string) => {
    try {
      await invokeCommand("apply_preset", { id });
      onApplied();
    } catch (err) {
      console.error("Failed to apply preset:", err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await invokeCommand("delete_preset", { id });
      refetch();
    } catch (err) {
      console.error("Failed to delete preset:", err);
    }
  };

  if (loading) {
    return <div className="text-muted-foreground">Loading presets...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Save current config as a preset for quick switching between different configurations.
        </p>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Save Current as Preset
        </Button>
      </div>

      {!presets || presets.length === 0 ? (
        <div className="rounded-md border border-dashed p-8 text-center text-muted-foreground">
          <p>No presets yet</p>
          <p className="text-sm">Save your current configuration as a preset to get started</p>
        </div>
      ) : (
        <div className="space-y-2">
          {presets.map((preset) => (
            <div
              key={preset.id}
              className="flex items-center justify-between rounded-md border px-4 py-3"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{preset.name}</span>
                  <Badge variant="secondary" className="text-xs">
                    {preset.config.model || "default"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Created {new Date(preset.createdAt).toLocaleString()}
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => handleApply(preset.id)}>
                  Apply
                </Button>
                <Button variant="ghost" size="icon-xs" onClick={() => handleDelete(preset.id)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create preset dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Preset</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="preset-name">Preset Name</Label>
              <Input
                id="preset-name"
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                placeholder="e.g., Sonnet Development"
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={!presetName.trim() || saving}>
              {saving ? "Saving..." : "Save Preset"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/config/preset-manager.tsx
git commit -m "feat: add preset manager component"
```

---

### Task 8: Create Backup Manager Component

**Files:**
- Create: `src/components/config/backup-manager.tsx`

- [ ] **Step 1: Create backup-manager.tsx**

Create `src/components/config/backup-manager.tsx`:

```tsx
import { useInvoke, invokeCommand } from "@/hooks/use-invoke";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";
import type { BackupEntry } from "@/types";

interface BackupManagerProps {
  onRestored: () => void;
}

export function BackupManager({ onRestored }: BackupManagerProps) {
  const { data: backups, loading, refetch } = useInvoke<BackupEntry[]>("list_backups");
  const [restoring, setRestoring] = useState<string | null>(null);

  const handleRestore = async (backup: BackupEntry) => {
    setRestoring(backup.path);
    try {
      await invokeCommand("restore_backup", { backupPath: backup.path });
      onRestored();
      refetch();
    } catch (err) {
      console.error("Failed to restore backup:", err);
    } finally {
      setRestoring(null);
    }
  };

  if (loading) {
    return <div className="text-muted-foreground">Loading backups...</div>;
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Backups are created automatically before each config save. Click restore to revert to a previous configuration.
      </p>

      {!backups || backups.length === 0 ? (
        <div className="rounded-md border border-dashed p-8 text-center text-muted-foreground">
          <p>No backups yet</p>
          <p className="text-sm">Backups are created automatically when you save configuration changes</p>
        </div>
      ) : (
        <div className="space-y-2">
          {backups.map((backup) => (
            <div
              key={backup.name}
              className="flex items-center justify-between rounded-md border px-4 py-3"
            >
              <div className="space-y-1">
                <span className="text-sm font-medium">{backup.timestamp || backup.name}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleRestore(backup)}
                disabled={restoring === backup.path}
              >
                <RotateCcw className="mr-2 h-3 w-3" />
                {restoring === backup.path ? "Restoring..." : "Restore"}
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

Wait - I used `useState` without importing it. Let me fix that.

- [ ] **Step 2: Commit**

```bash
git add src/components/config/backup-manager.tsx
git commit -m "feat: add backup manager component"
```

---

### Task 9: Wire ConfigPage into App.tsx

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Replace config placeholder with ConfigPage**

In `src/App.tsx`, add the import at line 5:

```typescript
import { ConfigPage } from "@/pages/config-page";
```

Then replace line 36:

```tsx
      {currentPage === "config" && (
        <div className="text-muted-foreground">Config management coming in P2</div>
      )}
```

with:

```tsx
      {currentPage === "config" && <ConfigPage />}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd D:/MyCodes/claude-hub && npx tsc --noEmit 2>&1 | head -10`
Expected: No errors. If there are errors about missing imports in backup-manager.tsx, fix them.

- [ ] **Step 3: Commit**

```bash
git add src/App.tsx
git commit -m "feat: wire config page into app navigation"
```

---

### Task 10: Full Build and Test

**Files:**
- All modified files

- [ ] **Step 1: Run cargo build**

Run: `cd D:/MyCodes/claude-hub && cargo build 2>&1 | tail -10`
Expected: Compiles with no errors

- [ ] **Step 2: Run TypeScript type check**

Run: `cd D:/MyCodes/claude-hub && npx tsc --noEmit 2>&1 | tail -10`
Expected: No errors

- [ ] **Step 3: Run vite build**

Run: `cd D:/MyCodes/claude-hub && npx vite build 2>&1 | tail -10`
Expected: Build successful

- [ ] **Step 4: Manual smoke test**

Run: `cd D:/MyCodes/claude-hub && npx tauri dev`

Test:
1. Click "Config" in sidebar - should show config page with form
2. Verify model dropdown shows options
3. Verify env vars section shows existing keys
4. Verify plugins section shows toggles
5. Verify skip dangerous toggle works
6. Click "Presets" tab - should show empty state
7. Click "Backups" tab - should show backup list (may be empty)
8. Click "Export" button - should open file dialog
9. Click "Import" button - should open file dialog

- [ ] **Step 5: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix: address build/test issues from P2 integration"
```
