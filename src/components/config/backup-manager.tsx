import { useState } from "react";
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
