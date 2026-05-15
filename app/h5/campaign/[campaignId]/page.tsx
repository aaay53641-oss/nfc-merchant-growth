"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { MapPin, Nfc, Store, Timer } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { fetchH5Campaign, fetchH5Tasks } from "@/lib/h5/mock";
import { useH5CampaignStore } from "@/store/h5-campaign-store";

export default function CampaignPage() {
  const params = useParams();
  const campaignId = params.campaignId as string;
  const taskStatus = useH5CampaignStore((state) => state.taskStatus);

  const { data: campaign, isLoading: campaignLoading } = useQuery({
    queryKey: ["h5-campaign", campaignId],
    queryFn: () => fetchH5Campaign(campaignId),
  });
  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ["h5-tasks", campaignId],
    queryFn: fetchH5Tasks,
  });

  const approvedCount = tasks.filter((task) => taskStatus[task.id] === "APPROVED").length;
  const progress = tasks.length ? Math.round((approvedCount / tasks.length) * 100) : 0;

  if (campaignLoading || tasksLoading || !campaign) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <section className="rounded-lg bg-slate-950 p-5 text-white">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-md bg-white text-xl font-bold text-slate-950">
            {campaign.merchant.logo}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm text-slate-300">{campaign.merchant.name}</p>
            <h2 className="text-2xl font-bold leading-tight">{campaign.title}</h2>
          </div>
        </div>
        <p className="text-sm leading-6 text-slate-200">{campaign.subtitle}</p>
        <div className="mt-4 grid gap-2 text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            <span>{campaign.merchant.address}</span>
          </div>
          <div className="flex items-center gap-2">
            <Timer className="h-4 w-4" />
            <span>
              {campaign.startDate} - {campaign.endDate}
            </span>
          </div>
        </div>
      </section>

      <Card className="border-blue-100 bg-blue-50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="rounded-md bg-blue-600 p-2 text-white">
              <Nfc className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-slate-950">NFC / 扫码入口</h3>
                <Badge variant="secondary">到店即玩</Badge>
              </div>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                {campaign.guide}。碰一碰桌贴或扫码进入，按顺序解锁每一关奖励。
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-950">闯关进度</p>
              <p className="text-xs text-slate-500">已通过 {approvedCount} / {tasks.length} 关</p>
            </div>
            <span className="text-lg font-bold text-blue-600">{progress}%</span>
          </div>
          <Progress value={progress} />
        </CardContent>
      </Card>

      <section className="space-y-3">
        {tasks.map((task) => (
          <Card key={task.id} className="overflow-hidden">
            <CardContent className="p-4">
              <div className="flex gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-slate-100 font-bold text-slate-700">
                  L{task.level}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-semibold text-slate-950">{task.shortTitle}</h3>
                    <Badge
                      variant={
                        taskStatus[task.id] === "APPROVED"
                          ? "success"
                          : taskStatus[task.id] === "LOCKED"
                          ? "muted"
                          : "default"
                      }
                    >
                      {taskStatus[task.id] === "APPROVED"
                        ? "已完成"
                        : taskStatus[task.id] === "LOCKED"
                        ? "未解锁"
                        : "可进行"}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm leading-6 text-slate-600">{task.description}</p>
                  <p className="mt-2 text-sm font-medium text-slate-900">奖励：{task.reward}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      <Card>
        <CardContent className="flex items-center gap-3 p-4">
          <Store className="h-5 w-5 text-slate-500" />
          <div className="text-sm text-slate-600">
            <p>营业时间：{campaign.merchant.businessHours}</p>
            <p>客服电话：{campaign.merchant.phone}</p>
          </div>
        </CardContent>
      </Card>

      <Button asChild className="h-12 w-full text-base">
        <Link href={`/h5/campaign/${campaignId}/tasks`}>开始闯关</Link>
      </Button>
    </div>
  );
}
