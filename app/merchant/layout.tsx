"use client";

import {
  BadgeCheck,
  BarChart3,
  ClipboardList,
  Gift,
  LogOut,
  MapPin,
  Megaphone,
  Nfc,
  Store,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/merchant/dashboard", label: "数据看板", icon: BarChart3 },
  { href: "/merchant/stores", label: "门店管理", icon: Store },
  { href: "/merchant/campaigns", label: "活动管理", icon: Megaphone },
  { href: "/merchant/tasks", label: "任务配置", icon: ClipboardList },
  { href: "/merchant/rewards", label: "奖励配置", icon: Gift },
  { href: "/merchant/reviews", label: "审核管理", icon: BadgeCheck },
  { href: "/merchant/nfc-cards", label: "NFC卡管理", icon: Nfc },
];

export default function MerchantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [merchantName, setMerchantName] = useState("加载中");

  useEffect(() => {
    if (pathname === "/merchant/login") return;

    let active = true;

    async function loadMerchantName() {
      try {
        const response = await fetch("/api/auth/me");
        if (!response.ok) throw new Error("Failed to load session");
        const data = await response.json();
        const name = data.merchant?.name ?? data.user?.merchantName ?? "商家后台";
        if (active) setMerchantName(name);
      } catch {
        if (active) setMerchantName("商家后台");
      }
    }

    loadMerchantName();

    return () => {
      active = false;
    };
  }, [pathname]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/merchant/login";
  };

  if (pathname === "/merchant/login") {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-950">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r bg-white lg:block">
        <div className="flex h-16 items-center gap-3 border-b px-5">
          <div className="flex size-9 items-center justify-center rounded-lg bg-slate-950 text-white">
            <MapPin className="size-5" />
          </div>
          <div>
            <p className="text-sm font-semibold">NFC寻宝增长</p>
            <p className="text-xs text-slate-500">商家后台</p>
          </div>
        </div>
        <nav className="space-y-1 p-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-slate-950 text-white"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                )}
              >
                <Icon className="size-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-white px-4 lg:px-6">
          <div>
            <p className="text-sm font-medium text-slate-500">当前商家</p>
            <h1 className="text-lg font-semibold">{merchantName}</h1>
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
