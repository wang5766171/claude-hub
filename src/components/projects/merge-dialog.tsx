import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { invokeCommand } from "@/hooks/use-invoke";

interface MergeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  primary: string;
  secondaries: string[];
  onMergeComplete: () => void;
}

export function MergeDialog({ open, onOpenChange, primary, secondaries, onMergeComplete }: MergeDialogProps) {
  const [mode, setMode] = useState<"logical" | "physical">("logical");
  const [loading, setLoading] = useState(false);

  const handleMerge = async () => {
    setLoading(true);
    try {
      await invokeCommand("merge_projects_logical", {
        primary,
        secondaries,
      });
      onMergeComplete();
      onOpenChange(false);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>合并项目</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <p className="text-sm text-muted-foreground">
            将 {secondaries.length} 个项目合并到主项目中
          </p>
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="merge-mode"
                checked={mode === "logical"}
                onChange={() => setMode("logical")}
              />
              <div>
                <div className="text-sm font-medium">逻辑合并（推荐）</div>
                <div className="text-xs text-muted-foreground">仅在 Hub 中合并显示，不修改实际文件，可随时拆分</div>
              </div>
            </label>
            <label className="flex items-center gap-2 cursor-pointer opacity-50">
              <input
                type="radio"
                name="merge-mode"
                checked={mode === "physical"}
                onChange={() => setMode("physical")}
                disabled
              />
              <div>
                <div className="text-sm font-medium">真合并</div>
                <div className="text-xs text-muted-foreground">物理合并项目文件（暂未实现）</div>
              </div>
            </label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button onClick={handleMerge} disabled={loading}>
            {loading ? "合并中..." : "确认合并"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
