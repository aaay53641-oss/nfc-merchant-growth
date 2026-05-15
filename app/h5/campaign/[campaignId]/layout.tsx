"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Gift, Home, PenLine, ReceiptText, Upload } from "lucide-react";

const navItems = [
  { href: "", label: "首页", icon: Home },
  { href: "tasks", label: "任务", icon: ReceiptText },
  { href: "ai-copy", label: "文案", icon: PenLine },
  { href: "submit", label: "上传", icon: Upload },
  { href: "rewards", label: "奖励", icon: Gift },
];

export default function H5Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const pathname = usePathname();
  const campaignId = params.campaignId as string;

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="mx-auto min-h-screen max-w-[430px] bg-white pb-24 shadow-sm">
        <header className="sticky top-0 z-50 border-b bg-white/95 backdrop-blur">
          <div className="flex items-center justify-between px-4 py-3">
            <h1 className="text-base font-semibold text-slate-950">寻宝活动</h1>
            <Button variant="ghost" size="sm" className="text-slate-600">
              <span className="text-xs">我的奖励</span>
            </Button>
          </div>
        </header>

        <main className="px-4 py-4">{children}</main>

        <nav className="fixed bottom-0 left-1/2 z-50 w-full max-w-[430px] -translate-x-1/2 border-t bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
          <div className="grid h-16 grid-cols-5">
            {navItems.map((item) => {
              const href = `/h5/campaign/${campaignId}${item.href ? `/${item.href}` : ""}`;
              const isActive = item.href
                ? pathname === href || pathname.startsWith(`${href}/`)
                : pathname === href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={href}
                  className={`flex h-full flex-col items-center justify-center gap-1 text-xs ${
                    isActive ? "text-blue-600" : "text-slate-500"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}
