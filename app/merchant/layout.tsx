"use client";

import {
  BadgeCheck,
  BarChart3,
  BrainCircuit,
  ClipboardList,
  Gift,
  LogOut,
  MapPin,
  Megaphone,
  Nfc,
  ScanLine,
  Store,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/merchant/dashboard", label: "数据看板", icon: BarChart3 },
  { href: "/merchant/analytics", label: "活动分析", icon: BarChart3 },
  { href: "/merchant/advisor", label: "运营参谋", icon: BrainCircuit },
  { href: "/merchant/stores", label: "门店管理", icon: Store },
  { href: "/merchant/campaigns", label: "活动管理", icon: Megaphone },
  { href: "/merchant/tasks", label: "任务配置", icon: ClipboardList },
  { href: "/merchant/rewards", label: "奖励配置", icon: Gift },
  { href: "/merchant/reviews", label: "审核管理", icon: BadgeCheck },
  { href: "/merchant/nfc-cards", label: "NFC卡管理", icon: Nfc },
  { href: "/merchant/mobile/redeem", label: "移动核销", icon: ScanLine },
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
    <div className="admin-shell-bg min-h-screen text-slate-950">
      <aside className="admin-sidebar-surface fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-white/10 text-white lg:block">
        <div className="flex h-20 items-center gap-3 border-b border-white/10 px-5">
          <div className="flex size-10 items-center justify-center rounded-2xl bg-white/10 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
            <MapPin className="size-5" />
          </div>
          <div>
            <p className="text-sm font-semibold">NFC寻宝增长</p>
            <p className="text-xs text-slate-300">商家后台</p>
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
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all active:scale-[0.99]",
                  active
                    ? "bg-white text-slate-950 shadow-[0_16px_28px_-24px_rgba(255,255,255,0.65)]"
                    : "text-slate-300 hover:bg-white/10 hover:text-white"
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
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200/70 bg-white/90 px-4 backdrop-blur-xl lg:px-6">
          <div>
            <p className="text-sm font-medium text-slate-500">当前商家</p>
            <h1 className="text-lg font-semibold">{merchantName}</h1>
          </div>
          <Button variant="outline" size="sm" type="button" onClick={handleLogout}>
            <LogOut className="size-4" />
            退出登录
          </Button>
        </header>
        <main className="min-h-[calc(100vh-4rem)] p-4 lg:p-6 page-fade-in">{children}</main>
      </div>
    </div>
  );
}
