"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const navItems = [
  { href: "", label: "活动首页" },
  { href: "rules", label: "规则说明" },
  { href: "tasks", label: "三关任务" },
  { href: "ai-copy", label: "AI文案" },
  { href: "submit", label: "上传凭证" },
  { href: "rewards", label: "奖励领取" },
  { href: "alliance", label: "异业券" },
];

export default function H5Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const campaignId = params.campaignId as string;
  const [currentPath, setCurrentPath] = useState("");

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white pb-20">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b">
        <div className="px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-gray-900">寻宝活动</h1>
          <Button variant="ghost" size="sm" className="text-gray-600">
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 py-4">{children}</main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t safe-area-inset-bottom">
        <div className="flex justify-around items-center h-16">
          {navItems.map((item) => {
            const href = `/h5/campaign/${campaignId}${item.href ? `/${item.href}` : ""}`;
            const isActive = currentPath === item.href;
            return (
              <Link
                key={item.href}
                href={href}
                className={`flex flex-col items-center justify-center w-full h-full text-xs ${
                  isActive ? "text-blue-600" : "text-gray-500"
                }`}
                onClick={() => setCurrentPath(item.href)}
              >
                <span className="text-base mb-1">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
