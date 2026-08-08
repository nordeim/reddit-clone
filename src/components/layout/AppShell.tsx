import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Navbar } from "./Navbar";
import { Sidebar, MobileSidebar } from "./Sidebar";
import { Toaster } from "../ui/Toaster";

export function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <Navbar onMenuClick={() => setMobileOpen(true)} />
      <MobileSidebar open={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="mx-auto flex max-w-[1400px]">
        <Sidebar />
        <main className="min-w-0 flex-1 px-3 py-4 sm:px-6 sm:py-6">
          <Outlet />
        </main>
      </div>
      <Toaster />
    </div>
  );
}
