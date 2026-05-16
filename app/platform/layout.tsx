"use client";

import {
  BarChart3,
  Building2,
  CreditCard,
  Handshake,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Settings,
  Store,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/platform/dashboard", label: "数据总览", icon: LayoutDashboard },
  { href: "/platform/merchants", label: "商家管理", icon: Building2 },
  { href: "/platform/stores", label: "门店管理", icon: Store },
  { href: "/platform/campaigns", label: "活动管理", icon: Megaphone },
  { href: "/platform/nfc-cards", label: "NFC卡管理", icon: CreditCard },
  { href: "/platform/alliance", label: "异业联盟", icon: Handshake },
  { href: "/platform/settings", label: "系统配置", icon: Settings },
];

export default function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [adminEmail, setAdminEmail] = useState("加载中");

  useEffect(() => {
    if (pathname === "/platform/login") return;

    let active = true;
    async function loadSession() {
      try {
        const response = await fetch("/api/platform/auth/me");
        if (!response.ok) throw new Error("Failed to load platform session");
        const data = await response.json();
        if (active) setAdminEmail(data.user?.email ?? "平台管理员");
      } catch {
        if (active) setAdminEmail("平台管理员");
      }
    }

    loadSession();
    return () => {
      active = false;
    };
  }, [pathname]);

  if (pathname === "/platform/login") {
    return children;
  }

  const handleLogout = async () => {
    await fetch("/api/platform/auth/logout", { method: "POST" });
    window.location.href = "/platform/login";
  };

  return (
    <div className="min-h-screen bg-slate-100">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r bg-white lg:block">
        <div className="flex h-16 items-center gap-3 border-b px-5">
          <div className="flex size-9 items-center justify-center rounded-lg bg-slate-900 text-white">
            <BarChart3 className="size-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-950">NFC Growth</p>
            <p className="text-xs text-slate-500">平台管理后台</p>
          </div>
        </div>
        <nav className="space-y-1 p-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                )}
              >
                <Icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-white px-4 lg:px-6">
          <div>
            <p className="text-sm font-medium text-slate-500">平台管理员</p>
            <h1 className="text-lg font-semibold text-slate-950">{adminEmail}</h1>
          </div>
          <Button variant="outline" size="sm" type="button" onClick={handleLogout}>
            <LogOut className="size-4" />
            退出登录
          </Button>
        </header>
        <main className="min-h-[calc(100vh-4rem)] p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
