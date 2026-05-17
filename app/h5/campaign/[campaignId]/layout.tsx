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
    <div className="h5-warm-bg min-h-screen">
      <div className="mx-auto min-h-screen max-w-[430px] overflow-hidden bg-white/90 pb-24 shadow-[0_24px_80px_-48px_rgba(31,41,55,0.45)] backdrop-blur">
        <header className="sticky top-0 z-50 border-b border-orange-100/80 bg-white/90 backdrop-blur-xl">
          <div className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-orange">Treasure NFC</p>
              <h1 className="text-base font-black tracking-tight text-brand-ink">寻宝活动</h1>
            </div>
            <Button variant="ghost" size="sm" className="rounded-full text-slate-600 hover:bg-orange-50 hover:text-brand-orange-deep">
              <span className="text-xs">我的奖励</span>
            </Button>
          </div>
        </header>

        <main className="px-4 py-4 page-fade-in">{children}</main>

        <nav className="fixed bottom-0 left-1/2 z-50 w-full max-w-[430px] -translate-x-1/2 px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
          <div className="grid h-16 grid-cols-5 rounded-2xl border border-orange-100/90 bg-white/95 p-1 shadow-[0_20px_50px_-28px_rgba(31,41,55,0.55)] backdrop-blur-xl">
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
                  className={`flex h-full flex-col items-center justify-center gap-1 rounded-xl text-xs transition-all active:scale-95 ${
                    isActive ? "bg-orange-50 text-brand-orange-deep shadow-sm" : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
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
