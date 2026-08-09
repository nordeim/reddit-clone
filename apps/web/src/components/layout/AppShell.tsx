import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Navbar } from "./Navbar";
import { Sidebar, MobileSidebar } from "./Sidebar";
import { ErrorBoundary } from "./ErrorBoundary";
import { Toaster } from "../ui/Toaster";

export function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Skip link — keyboard users can jump straight to main content. */}
      <a href="#main" className="skip-link">Skip to content</a>
      <Navbar onMenuClick={() => setMobileOpen(true)} />
      <MobileSidebar open={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="mx-auto flex max-w-[1400px]">
        <Sidebar />
        <main id="main" className="min-w-0 flex-1 px-3 py-4 sm:px-6 sm:py-6">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
      <Toaster />
    </div>
  );
}
