"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Film, ImageIcon, LayoutDashboard, Menu, Settings, Terminal } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

const baseNav = [
  { name: "概览", href: "/", icon: LayoutDashboard },
  { name: "项目", href: "/projects", icon: Film },
  { name: "资产", href: "/assets", icon: ImageIcon },
  { name: "设置", href: "/settings", icon: Settings },
];

function Sidebar({ className }: { className?: string }) {
  const pathname = usePathname();
  const [devMode, setDevMode] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        const devSetting = data.find((s: any) => s.key === "DEV_MODE");
        setDevMode(devSetting?.value === "true");
      });
  }, []);

  const nav = devMode
    ? [...baseNav.slice(0, -1), { name: "开发", href: "/dev", icon: Terminal }, ...baseNav.slice(-1)]
    : baseNav;

  return (
    <div className={cn("flex h-full flex-col border-r bg-muted/40", className)}>
      <div className="flex h-14 items-center border-b px-4 font-semibold tracking-tight">
        OpenCinema
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {nav.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-foreground/80 hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.name}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="hidden w-60 md:block">
        <Sidebar />
      </aside>
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 items-center justify-between border-b bg-muted/40 px-4 md:hidden">
          <span className="font-semibold">OpenCinema</span>
          <Sheet>
            <SheetTrigger className="inline-flex h-9 w-9 items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground">
              <Menu className="h-5 w-5" />
            </SheetTrigger>
            <SheetContent side="left" className="p-0">
              <Sidebar />
            </SheetContent>
          </Sheet>
        </header>
        <main className="flex-1 overflow-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}

