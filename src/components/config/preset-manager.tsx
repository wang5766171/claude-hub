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
import { Plus, Trash2 } from "lucide-react";
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
          Save current config as a preset for quick switching between configurations.
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
