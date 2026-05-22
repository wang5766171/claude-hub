import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { invokeCommand } from "@/hooks/use-invoke";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Save, Plus, Trash2 } from "lucide-react";
import type { ClaudeConfig, ConfigTemplate } from "@/types";

const MODEL_OPTIONS = [
  "claude-sonnet-4-6",
  "claude-opus-4-7",
  "claude-haiku-4-5-20251001",
];

const API_PROVIDERS = [
  { value: "anthropic", labelKey: "providerAnthropic" },
  { value: "bedrock", labelKey: "providerBedrock" },
  { value: "vertex", labelKey: "providerVertex" },
];

const PERMISSION_MODES = [
  { value: "default", labelKey: "modeDefault" },
  { value: "bypassPermissions", labelKey: "modeBypass" },
  { value: "plan", labelKey: "modePlan" },
];

const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

interface ConfigFormProps {
  config: ClaudeConfig;
  onSaved: (config: ClaudeConfig) => void;
}

export function ConfigForm({ config: initialConfig, onSaved }: ConfigFormProps) {
  const { t } = useTranslation();
  const [config, setConfig] = useState<ClaudeConfig>(initialConfig);
  const [saving, setSaving] = useState(false);
  const [templates, setTemplates] = useState<ConfigTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState("");

  // List pattern inputs
  const [newAllowPattern, setNewAllowPattern] = useState("");
  const [newDenyPattern, setNewDenyPattern] = useState("");

  // Env var input
  const [newEnvKey, setNewEnvKey] = useState("");

  useEffect(() => {
    invokeCommand<ConfigTemplate[]>("list_config_templates")
      .then(setTemplates)
      .catch(console.error);
  }, []);

  const handleApplyTemplate = (templateId: string) => {
    const template = templates.find((t) => t.id === templateId);
    if (!template) return;
    setConfig(template.config);
    setSelectedTemplate(templateId);
  };

  // --- Field handlers ---

  const updateConfig = (partial: Partial<ClaudeConfig>) => {
    setConfig((prev) => ({ ...prev, ...partial }));
  };

  const updatePermissions = (partial: Partial<ClaudeConfig["permissions"]>) => {
    setConfig((prev) => ({
      ...prev,
      permissions: { ...(prev.permissions || {}), ...partial } as ClaudeConfig["permissions"],
    }));
  };

  // Model
  const handleModelChange = (model: string) => updateConfig({ model: model || null });
  const handleSmallModelChange = (val: string) => updateConfig({ smallModel: val || null });
  const handleLargeModelChange = (val: string) => updateConfig({ largeModel: val || null });
  const handleApiProviderChange = (val: string) => updateConfig({ apiProvider: val || null });

  // Permissions
  const handlePermissionMode = (val: string) =>
    updatePermissions({ defaultMode: val || null });

  const handleAddAllowPattern = () => {
    if (!newAllowPattern.trim()) return;
    const allow = [...(config.permissions?.allow ?? []), newAllowPattern.trim()];
    updatePermissions({ allow });
    setNewAllowPattern("");
  };

  const handleRemoveAllowPattern = (idx: number) => {
    const allow = [...(config.permissions?.allow ?? [])];
    allow.splice(idx, 1);
    updatePermissions({ allow: allow.length > 0 ? allow : null });
  };

  const handleAddDenyPattern = () => {
    if (!newDenyPattern.trim()) return;
    const deny = [...(config.permissions?.deny ?? []), newDenyPattern.trim()];
    updatePermissions({ deny });
    setNewDenyPattern("");
  };

  const handleRemoveDenyPattern = (idx: number) => {
    const deny = [...(config.permissions?.deny ?? [])];
    deny.splice(idx, 1);
    updatePermissions({ deny: deny.length > 0 ? deny : null });
  };

  // Sandbox
  const handleSandboxEnabled = (checked: boolean) => {
    setConfig((prev) => ({
      ...prev,
      sandbox: { ...(prev.sandbox || {}), enabled: checked } as ClaudeConfig["sandbox"],
    }));
  };

  // Skip Dangerous
  const handleSkipDangerous = (checked: boolean) => {
    updateConfig({ skipDangerousModePermissionPrompt: checked || null });
  };

  // Env vars
  const handleEnvChange = (key: string, value: string) => {
    const env = { ...(config.env || {}) };
    env[key] = value;
    updateConfig({ env });
  };

  const handleEnvDelete = (key: string) => {
    const env = { ...(config.env || {}) };
    delete env[key];
    updateConfig({ env });
  };

  const handleAddEnv = () => {
    if (!newEnvKey.trim()) return;
    const env = { ...(config.env || {}) };
    env[newEnvKey.trim()] = "";
    updateConfig({ env });
    setNewEnvKey("");
  };

  // Plugins
  const handlePluginToggle = (plugin: string, enabled: boolean) => {
    const plugins = { ...(config.enabledPlugins || {}) };
    plugins[plugin] = enabled;
    updateConfig({ enabledPlugins: plugins });
  };

  const handlePluginDelete = (plugin: string) => {
    const plugins = { ...(config.enabledPlugins || {}) };
    delete plugins[plugin];
    updateConfig({ enabledPlugins: plugins });
  };

  // Advanced
  const handleVerbose = (checked: boolean) => updateConfig({ verbose: checked || null });
  const handleMaxTurns = (val: string) => {
    const n = parseInt(val, 10);
    updateConfig({ maxTurns: isNaN(n) || n <= 0 ? null : n });
  };

  // Save
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
        <h3 className="text-lg font-semibold">{t("config.configuration")}</h3>
        <Button onClick={handleSave} disabled={!hasChanges || saving} size="sm">
          <Save className="mr-2 h-4 w-4" />
          {saving ? t("common.saving") : t("common.save")}
        </Button>
      </div>

      {/* Template Selector */}
      <div className="space-y-2">
        <Label>{t("config.templateTitle")}</Label>
        <div className="flex items-center gap-2">
          <select
            value={selectedTemplate}
            onChange={(e) => setSelectedTemplate(e.target.value)}
            className={selectClass}
          >
            <option value="">{t("config.templateSelect")}</option>
            {templates.map((tpl) => (
              <option key={tpl.id} value={tpl.id}>
                {tpl.name} - {tpl.description}
              </option>
            ))}
          </select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleApplyTemplate(selectedTemplate)}
            disabled={!selectedTemplate}
          >
            {t("config.templateApply")}
          </Button>
        </div>
      </div>

      <Accordion type="multiple" defaultValue={["model", "permissions", "env", "plugins", "advanced"]}>
        {/* Model Settings */}
        <AccordionItem value="model">
          <AccordionTrigger>{t("config.modelSettings")}</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="model">{t("config.model")}</Label>
                <select
                  id="model"
                  value={config.model || ""}
                  onChange={(e) => handleModelChange(e.target.value)}
                  className={selectClass}
                >
                  <option value="">{t("common.default")}</option>
                  {MODEL_OPTIONS.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="smallModel">{t("config.smallModel")}</Label>
                <Input
                  id="smallModel"
                  value={config.smallModel || ""}
                  onChange={(e) => handleSmallModelChange(e.target.value)}
                  placeholder="e.g., claude-haiku-4-5-20251001"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="largeModel">{t("config.largeModel")}</Label>
                <Input
                  id="largeModel"
                  value={config.largeModel || ""}
                  onChange={(e) => handleLargeModelChange(e.target.value)}
                  placeholder="e.g., claude-opus-4-7"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="apiProvider">{t("config.apiProvider")}</Label>
                <select
                  id="apiProvider"
                  value={config.apiProvider || ""}
                  onChange={(e) => handleApiProviderChange(e.target.value)}
                  className={selectClass}
                >
                  <option value="">{t("common.default")}</option>
                  {API_PROVIDERS.map((p) => (
                    <option key={p.value} value={p.value}>
                      {t(`config.${p.labelKey}`)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Permissions & Security */}
        <AccordionItem value="permissions">
          <AccordionTrigger>{t("config.permissionsSecurity")}</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="permMode">{t("config.permissionMode")}</Label>
                <select
                  id="permMode"
                  value={config.permissions?.defaultMode || ""}
                  onChange={(e) => handlePermissionMode(e.target.value)}
                  className={selectClass}
                >
                  <option value="">{t("common.default")}</option>
                  {PERMISSION_MODES.map((m) => (
                    <option key={m.value} value={m.value}>
                      {t(`config.${m.labelKey}`)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Allow List */}
              <div className="space-y-2">
                <Label>{t("config.allowList")}</Label>
                <div className="space-y-2">
                  {(config.permissions?.allow ?? []).map((pattern, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <code className="flex-1 rounded bg-muted px-2 py-1 text-xs font-mono">{pattern}</code>
                      <Button variant="ghost" size="icon-xs" onClick={() => handleRemoveAllowPattern(idx)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                  <div className="flex items-center gap-2">
                    <Input
                      value={newAllowPattern}
                      onChange={(e) => setNewAllowPattern(e.target.value)}
                      placeholder={t("config.patternPlaceholder")}
                      className="flex-1"
                      onKeyDown={(e) => e.key === "Enter" && handleAddAllowPattern()}
                    />
                    <Button variant="outline" size="sm" onClick={handleAddAllowPattern} disabled={!newAllowPattern.trim()}>
                      <Plus className="mr-1 h-3 w-3" />
                      {t("config.addPattern")}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Deny List */}
              <div className="space-y-2">
                <Label>{t("config.denyList")}</Label>
                <div className="space-y-2">
                  {(config.permissions?.deny ?? []).map((pattern, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <code className="flex-1 rounded bg-muted px-2 py-1 text-xs font-mono">{pattern}</code>
                      <Button variant="ghost" size="icon-xs" onClick={() => handleRemoveDenyPattern(idx)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                  <div className="flex items-center gap-2">
                    <Input
                      value={newDenyPattern}
                      onChange={(e) => setNewDenyPattern(e.target.value)}
                      placeholder={t("config.patternPlaceholder")}
                      className="flex-1"
                      onKeyDown={(e) => e.key === "Enter" && handleAddDenyPattern()}
                    />
                    <Button variant="outline" size="sm" onClick={handleAddDenyPattern} disabled={!newDenyPattern.trim()}>
                      <Plus className="mr-1 h-3 w-3" />
                      {t("config.addPattern")}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Sandbox */}
              <div className="flex items-center justify-between rounded-md border px-3 py-3">
                <div className="space-y-0.5">
                  <Label>{t("config.sandbox")}</Label>
                  <p className="text-xs text-muted-foreground">
                    {config.sandbox?.enabled ? t("config.enabled") : t("config.disabled")}
                  </p>
                </div>
                <Switch
                  checked={config.sandbox?.enabled === true}
                  onCheckedChange={handleSandboxEnabled}
                />
              </div>

              {/* Skip Dangerous */}
              <div className="flex items-center justify-between rounded-md border px-3 py-3">
                <div className="space-y-0.5">
                  <Label>{t("config.skipDangerous")}</Label>
                  <p className="text-xs text-muted-foreground">{t("config.skipDangerousDesc")}</p>
                </div>
                <Switch
                  checked={config.skipDangerousModePermissionPrompt === true}
                  onCheckedChange={handleSkipDangerous}
                />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Environment Variables */}
        <AccordionItem value="env">
          <AccordionTrigger>{t("config.envVars")}</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-2 pt-2">
              {Object.entries(config.env || {}).map(([key, value]) => (
                <div key={key} className="flex items-center gap-2">
                  <code className="min-w-[140px] rounded bg-muted px-2 py-1 text-xs font-mono">{key}</code>
                  <Input
                    value={value}
                    onChange={(e) => handleEnvChange(key, e.target.value)}
                    className="flex-1"
                    placeholder={t("config.value")}
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
                  placeholder={t("config.key")}
                  onKeyDown={(e) => e.key === "Enter" && handleAddEnv()}
                />
                <Button variant="outline" size="sm" onClick={handleAddEnv} disabled={!newEnvKey.trim()}>
                  <Plus className="mr-1 h-3 w-3" />
                  {t("common.add")}
                </Button>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Plugins */}
        <AccordionItem value="plugins">
          <AccordionTrigger>{t("config.enabledPlugins")}</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-2 pt-2">
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
                <p className="text-sm text-muted-foreground">{t("config.noPlugins")}</p>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Advanced Settings */}
        <AccordionItem value="advanced">
          <AccordionTrigger>{t("config.advanced")}</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between rounded-md border px-3 py-3">
                <Label>{t("config.verbose")}</Label>
                <Switch
                  checked={config.verbose === true}
                  onCheckedChange={handleVerbose}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxTurns">{t("config.maxTurns")}</Label>
                <Input
                  id="maxTurns"
                  type="number"
                  min={1}
                  value={config.maxTurns ?? ""}
                  onChange={(e) => handleMaxTurns(e.target.value)}
                  placeholder="e.g., 200"
                />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
