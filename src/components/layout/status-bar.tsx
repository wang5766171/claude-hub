interface StatusBarProps {
  modelName: string | null;
  projectCount: number;
}

export function StatusBar({ modelName, projectCount }: StatusBarProps) {
  return (
    <footer className="flex items-center gap-4 border-t border-border bg-card px-4 py-1.5 text-xs text-muted-foreground">
      <span>Model: {modelName ?? "default"}</span>
      <span>Projects: {projectCount}</span>
    </footer>
  );
}
