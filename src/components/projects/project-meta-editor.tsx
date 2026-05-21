import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { invokeCommand } from "@/hooks/use-invoke";
import { Pencil, Check, X, Plus } from "lucide-react";
import type { ProjectMeta } from "@/types";

interface ProjectMetaEditorProps {
  encodedName: string;
  meta?: ProjectMeta;
  allTags?: string[];
  onUpdate: () => void;
}

export function ProjectMetaEditor({ encodedName, meta, allTags, onUpdate }: ProjectMetaEditorProps) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(meta?.custom_name || "");
  const [notes, setNotes] = useState(meta?.notes || "");
  const [tags, setTags] = useState<string[]>(meta?.tags || []);
  const [tagInput, setTagInput] = useState("");

  const suggestions = useMemo(() => {
    const q = tagInput.trim().toLowerCase();
    const existing = new Set(tags);
    return (allTags ?? []).filter(t => !existing.has(t) && (q === "" || t.toLowerCase().includes(q)));
  }, [allTags, tags, tagInput]);

  const handleSave = async () => {
    await invokeCommand("save_project_meta", {
      encodedName,
      meta: {
        custom_name: name || undefined,
        tags: tags.length > 0 ? tags : undefined,
        notes: notes || undefined,
      },
    });
    setEditing(false);
    onUpdate();
  };

  const handleCancel = () => {
    setName(meta?.custom_name || "");
    setNotes(meta?.notes || "");
    setTags(meta?.tags || []);
    setEditing(false);
  };

  const addTag = () => {
    const trimmed = tagInput.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setTagInput("");
    }
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  if (!editing) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">项目信息</span>
          <Button variant="ghost" size="icon-xs" onClick={() => setEditing(true)}>
            <Pencil className="h-3 w-3" />
          </Button>
        </div>
        {meta?.custom_name && (
          <div className="text-sm">
            <span className="text-muted-foreground">自定义名称：</span>
            {meta.custom_name}
          </div>
        )}
        {meta?.tags && meta.tags.length > 0 && (
          <div className="text-sm">
            <span className="text-muted-foreground">标签：</span>
            <div className="flex gap-1 mt-1 flex-wrap">
              {meta.tags.map(tag => (
                <span key={tag} className="inline-flex items-center px-1.5 py-0.5 text-xs bg-secondary text-secondary-foreground rounded">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}
        {meta?.notes && (
          <div className="text-sm">
            <span className="text-muted-foreground">备注：</span>
            {meta.notes}
          </div>
        )}
        {!meta?.custom_name && !meta?.tags?.length && !meta?.notes && (
          <p className="text-xs text-muted-foreground">点击编辑按钮添加自定义名称、标签或备注</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">编辑项目信息</span>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon-xs" onClick={handleCancel}>
            <X className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="icon-xs" onClick={handleSave}>
            <Check className="h-3 w-3" />
          </Button>
        </div>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">自定义名称</Label>
        <Input value={name} onChange={e => setName(e.target.value)} placeholder="输入自定义名称" className="h-8 text-sm" />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">标签</Label>
        <div className="flex gap-1 flex-wrap mb-1">
          {tags.map(tag => (
            <span key={tag} className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs bg-secondary text-secondary-foreground rounded">
              {tag}
              <X className="h-2.5 w-2.5 cursor-pointer" onClick={() => removeTag(tag)} />
            </span>
          ))}
        </div>
        <div className="flex gap-1">
          <Input value={tagInput} onChange={e => setTagInput(e.target.value)} placeholder="输入标签" className="h-7 text-xs" onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addTag(); }}} />
          <Button variant="outline" size="icon-xs" onClick={addTag}>
            <Plus className="h-3 w-3" />
          </Button>
        </div>
        {suggestions.length > 0 && (
          <div className="flex gap-1 flex-wrap">
            {suggestions.map(tag => (
              <button
                key={tag}
                type="button"
                className="inline-flex items-center px-1.5 py-0.5 text-xs border border-dashed rounded hover:bg-accent transition-colors"
                onClick={() => { setTags([...tags, tag]); setTagInput(""); }}
              >
                + {tag}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="space-y-1">
        <Label className="text-xs">备注</Label>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="输入备注" className="w-full min-h-[60px] text-sm border rounded-md px-2 py-1 resize-none" />
      </div>
    </div>
  );
}
