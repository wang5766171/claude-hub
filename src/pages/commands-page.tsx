import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useInvoke, invokeCommand } from "@/hooks/use-invoke";
import { AddCommandDialog } from "@/components/commands/add-command-dialog";
import { CommandOutputDialog } from "@/components/commands/command-output-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Play, Pencil, Trash2, Terminal } from "lucide-react";
import type { CustomCommand, CommandOutput } from "@/types";

const BUILT_IN_COMMANDS = [
  { name: "claude --version", command: "claude --version" },
  { name: "claude config list", command: "claude config list" },
  { name: "claude mcp list", command: "claude mcp list" },
];

export function CommandsPage() {
  const { t } = useTranslation();
  const { data: commands, loading, refetch } = useInvoke<CustomCommand[]>("list_custom_commands");
  const [addOpen, setAddOpen] = useState(false);
  const [editCmd, setEditCmd] = useState<CustomCommand | null>(null);
  const [outputOpen, setOutputOpen] = useState(false);
  const [output, setOutput] = useState<CommandOutput | null>(null);
  const [outputName, setOutputName] = useState("");
  const [running, setRunning] = useState<string | null>(null);

  const handleRun = async (cmd: string, name: string, cwd?: string | null) => {
    setRunning(name);
    try {
      const result = await invokeCommand<CommandOutput>("execute_command", {
        command: cmd,
        cwd: cwd || undefined,
      });
      setOutput(result);
      setOutputName(name);
      setOutputOpen(true);
    } catch (err) {
      setOutput({
        success: false,
        stdout: "",
        stderr: String(err),
        code: null,
      });
      setOutputName(name);
      setOutputOpen(true);
    } finally {
      setRunning(null);
    }
  };

  const handleDelete = async (id: string) => {
    await invokeCommand("delete_custom_command", { id });
    refetch();
  };

  const handleEdit = (cmd: CustomCommand) => {
    setEditCmd(cmd);
    setAddOpen(true);
  };

  const handleAddNew = () => {
    setEditCmd(null);
    setAddOpen(true);
  };

  const handleSaved = () => {
    refetch();
    setEditCmd(null);
  };

  if (loading) {
    return <Skeleton className="h-64" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">{t("commands.title")}</h2>
        <Button size="sm" onClick={handleAddNew}>
          <Plus className="mr-2 h-4 w-4" />
          {t("commands.addCommand")}
        </Button>
      </div>

      {/* Built-in commands */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground">{t("commands.builtIn")}</h3>
        <div className="space-y-2">
          {BUILT_IN_COMMANDS.map((cmd) => (
            <div key={cmd.name} className="flex items-center justify-between rounded-md border px-4 py-3">
              <div className="flex items-center gap-2">
                <Terminal className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-mono">{cmd.name}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleRun(cmd.command, cmd.name)}
                disabled={running === cmd.name}
              >
                <Play className="mr-1 h-3 w-3" />
                {running === cmd.name ? t("commands.running") : t("commands.run")}
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Custom commands */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground">{t("commands.custom")}</h3>
        {!commands || commands.length === 0 ? (
          <div className="rounded-md border border-dashed p-8 text-center text-muted-foreground">
            <p>{t("commands.noCommands")}</p>
            <p className="text-sm">{t("commands.noCommandsDesc")}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {commands.map((cmd) => (
              <div key={cmd.id} className="flex items-center justify-between rounded-md border px-4 py-3">
                <div className="space-y-1 min-w-0">
                  <span className="text-sm font-medium">{cmd.name}</span>
                  <p className="text-xs font-mono text-muted-foreground truncate">{cmd.command}</p>
                  {cmd.projectPath && (
                    <p className="text-xs text-muted-foreground">{cmd.projectPath}</p>
                  )}
                </div>
                <div className="flex gap-1 shrink-0 ml-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRun(cmd.command, cmd.name, cmd.projectPath)}
                    disabled={running === cmd.name}
                  >
                    <Play className="mr-1 h-3 w-3" />
                    {running === cmd.name ? t("commands.running") : t("commands.run")}
                  </Button>
                  <Button variant="ghost" size="icon-xs" onClick={() => handleEdit(cmd)}>
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="icon-xs" onClick={() => handleDelete(cmd.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <AddCommandDialog
        open={addOpen}
        onOpenChange={(open) => { setAddOpen(open); if (!open) setEditCmd(null); }}
        editCommand={editCmd}
        onSaved={handleSaved}
      />

      <CommandOutputDialog
        open={outputOpen}
        onOpenChange={setOutputOpen}
        output={output}
        commandName={outputName}
      />
    </div>
  );
}
