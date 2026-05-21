import type { ReactNode } from "react";
import { Sidebar } from "./sidebar";
import { StatusBar } from "./status-bar";
import { TitleBar } from "./title-bar";
import type { Page } from "@/types";

interface AppLayoutProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  modelName: string | null;
  projectCount: number;
  children: ReactNode;
}

export function AppLayout({ currentPage, onNavigate, modelName, projectCount, children }: AppLayoutProps) {
  return (
    <div className="flex h-screen flex-col bg-background">
      <TitleBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar currentPage={currentPage} onNavigate={onNavigate} />
        <main className="flex-1 overflow-hidden">{children}</main>
      </div>
      <StatusBar modelName={modelName} projectCount={projectCount} />
    </div>
  );
}
