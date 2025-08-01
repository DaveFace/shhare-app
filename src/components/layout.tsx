import { Titlebar } from "./titlebar";
import { AppSidebar } from "./app-sidebar";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="h-screen bg-base-100 flex flex-col overflow-hidden relative">
      <Titlebar />
      <div className="flex flex-1 overflow-hidden">
        <AppSidebar />
          <main className="flex-1 overflow-hidden bg-base-100">{children}</main>
      </div>
    </div>
  );
}
