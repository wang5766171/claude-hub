import { useState } from "react";
import { invokeCommand } from "@/hooks/use-invoke";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
