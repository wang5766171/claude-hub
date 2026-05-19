import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useTranslation } from "react-i18next";
import type { CommandOutput } from "@/types";

interface CommandOutputDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  output: CommandOutput | null;
  commandName: string;
}

export function CommandOutputDialog({ open, onOpenChange, output, commandName }: CommandOutputDialogProps) {
  const { t } = useTranslation();

  if (!output) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className={output.success ? "text-green-600" : "text-destructive"}>
            {output.success
              ? t("commands.success")
              : t("commands.failed", { code: output.code ?? "?" })}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">{commandName}</p>
          <div className="rounded-md bg-muted p-3 max-h-80 overflow-auto">
            <pre className="text-sm font-mono whitespace-pre-wrap break-all">
              {output.stdout || output.stderr || t("commands.noOutput")}
            </pre>
            {output.stderr && (
              <pre className="mt-2 text-sm font-mono text-destructive whitespace-pre-wrap break-all">
                {output.stderr}
              </pre>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
