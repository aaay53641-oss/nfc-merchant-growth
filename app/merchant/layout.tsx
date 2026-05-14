"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/merchant/dashboard", label: "工作台", icon: "📊" },
  { href: "/merchant/stores", label: "门店管理", icon: "🏪" },
  { href: "/merchant/campaigns", label: "活动管理", icon: "🎯" },
  { href: "/merchant/tasks", label: "任务配置", icon: "📋" },
  { href: "/merchant/rewards", label: "奖励配置", icon: "🎁" },
  { href: "/merchant/reviews", label: "审核管理", icon: "✅" },
  { href: "/merchant/analytics", label: "数据看板", icon: "📈" },
];

export default function MerchantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="flex items-center justify-between px-6 py-4">
          <h1 className="text-xl font-bold text-gray-900">商家后台</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">商家名称</span>
            <Button variant="outline" size="sm">
              退出
            </Button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-white shadow-sm min-h-[calc(100vh-73px)]">
          <nav className="p-4 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                  pathname === item.href
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-700 hover:bg-gray-50"
                )}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
