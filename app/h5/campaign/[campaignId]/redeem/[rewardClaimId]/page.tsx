"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, CalendarDays, MapPin, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/components/ui/use-toast";
import { fetchRedemptionDetail } from "@/lib/h5/api";

function formatDate(value: string | null) {
  if (!value) return "以门店说明为准";
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function redemptionStatus(status: string) {
  if (status === "USED") return { label: "已核销", variant: "muted" as const };
  if (status === "EXPIRED") return { label: "已过期", variant: "outline" as const };
  return { label: "可使用", variant: "success" as const };
}

export default function RedeemPage() {
  const params = useParams();
  const campaignId = params.campaignId as string;
  const rewardClaimId = params.rewardClaimId as string;

  const { data, isLoading } = useQuery({
    queryKey: ["h5-redemption", rewardClaimId],
    queryFn: () => fetchRedemptionDetail(rewardClaimId),
  });

  const copyCode = async () => {
    if (!data?.code) return;
    await navigator.clipboard.writeText(data.code);
    toast({ title: "已复制核销码", description: "截图保存或到店出示均可。" });
  };

  if (isLoading || !data) {
    return (
      <div className="space-y-4">
        <div className="skeleton-block h-40" />
        <div className="skeleton-block h-56" />
      </div>
    );
  }

  const status = redemptionStatus(data.status);

  return (
    <div className="-mx-4 -my-4 min-h-screen bg-[#F5F0EB] px-4 pb-8 pt-4">
      <Button asChild variant="ghost" className="mb-3 px-0 text-slate-600">
        <Link href={`/h5/campaign/${campaignId}/rewards`}>
          <ArrowLeft className="size-4" />
          返回奖励
        </Link>
      </Button>

      <section className="rounded-[30px] bg-slate-950 p-5 text-white shadow-[0_24px_60px_-42px_rgba(15,23,42,0.8)]">
        <div className="flex items-center justify-between">
          <Badge variant={status.variant} className="border-white/20 shadow-none">
            {status.label}
          </Badge>
          <ShieldCheck className="size-6 text-orange-200" />
        </div>
        <h1 className="mt-5 text-2xl font-black">{data.reward.name}</h1>
        <p className="mt-2 text-sm leading-6 text-slate-300">{data.reward.description ?? "到店出示核销码即可使用"}</p>
      </section>

      <Card className="mt-4 border-orange-100 bg-white">
        <CardContent className="space-y-5 p-5 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Redeem code</p>
          <div className="rounded-[26px] border border-orange-100 bg-orange-50 px-4 py-6">
            <p className="font-mono text-5xl font-black tracking-[0.2em] text-slate-950">{data.code}</p>
            <p className="mt-3 text-xs text-slate-500">6 位数字核销码</p>
          </div>

          <div className="mx-auto grid h-44 w-44 grid-cols-6 gap-1 rounded-[28px] bg-white p-4 shadow-inner">
            {data.visualCodeCells.map((active, index) => (
              <div
                key={index}
                className={`rounded-[4px] ${active ? "bg-slate-950" : "bg-slate-200"}`}
              />
            ))}
          </div>

          <Button className="h-12 w-full rounded-2xl" onClick={copyCode}>
            截图保存核销码，到店出示
          </Button>
        </CardContent>
      </Card>

      <Card className="mt-4 border-slate-100 bg-white">
        <CardContent className="space-y-3 p-4 text-sm text-slate-600">
          <div className="flex gap-3">
            <MapPin className="mt-0.5 size-4 text-brand-orange" />
            <div>
              <p className="font-semibold text-slate-950">{data.store.name}</p>
              <p>{data.store.address ?? "到店咨询使用门店"}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <CalendarDays className="mt-0.5 size-4 text-brand-orange" />
            <div>
              <p className="font-semibold text-slate-950">有效期</p>
              <p>{formatDate(data.reward.validUntil)}</p>
            </div>
          </div>
          <div className="rounded-2xl bg-slate-50 p-3 text-xs leading-5 text-slate-500">
            使用条件：到店出示核销码，由店员在商家移动端确认核销。截图保存即可，不需要跳转小程序。
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
