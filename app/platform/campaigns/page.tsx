"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/use-toast";

type Campaign = {
  id: string;
  title: string;
  merchantName: string;
  storeName: string;
  startDate: string;
  endDate: string;
  status: "DRAFT" | "ACTIVE" | "PAUSED" | "ENDED";
  participants: number;
};

async function fetchCampaigns(): Promise<Campaign[]> {
  const response = await fetch("/api/platform/campaigns");
  if (!response.ok) throw new Error("Failed to load campaigns");
  const data = await response.json();
  return data.campaigns;
}

function statusBadge(status: Campaign["status"]) {
  if (status === "ACTIVE") return <Badge variant="success">上线</Badge>;
  if (status === "PAUSED") return <Badge variant="warning">下线/暂停</Badge>;
  if (status === "ENDED") return <Badge variant="muted">已结束</Badge>;
  return <Badge variant="secondary">草稿</Badge>;
}

export default function PlatformCampaignsPage() {
  const queryClient = useQueryClient();
  const { data: campaigns, isLoading } = useQuery({
    queryKey: ["platform-campaigns"],
    queryFn: fetchCampaigns,
  });

  const statusMutation = useMutation({
    mutationFn: async (input: { id: string; status: "ACTIVE" | "PAUSED" | "ENDED" }) => {
      const response = await fetch(`/api/platform/campaigns/${input.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: input.status }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error ?? "更新活动状态失败");
      }
      return response.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["platform-campaigns"] });
      toast({ title: "活动状态已更新" });
    },
    onError: (error) => toast({ title: "更新失败", description: error.message }),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-950">活动管理</h1>
        <p className="text-sm text-slate-500">查看全平台活动并强制上下架。</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>活动列表</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center text-sm text-slate-500">加载中...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-slate-500">
                    <th className="py-3 pr-4 font-medium">活动</th>
                    <th className="py-3 pr-4 font-medium">商家/门店</th>
                    <th className="py-3 pr-4 font-medium">时间</th>
                    <th className="py-3 pr-4 font-medium">状态</th>
                    <th className="py-3 pr-4 font-medium">参与人次</th>
                    <th className="py-3 text-right font-medium">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {(campaigns ?? []).map((campaign) => (
                    <tr key={campaign.id} className="border-b last:border-0">
                      <td className="py-3 pr-4 font-medium">{campaign.title}</td>
                      <td className="py-3 pr-4 text-slate-600">
                        {campaign.merchantName}
                        <p className="text-xs text-slate-500">{campaign.storeName}</p>
                      </td>
                      <td className="py-3 pr-4">
                        {campaign.startDate.slice(0, 10)} ~ {campaign.endDate.slice(0, 10)}
                      </td>
                      <td className="py-3 pr-4">{statusBadge(campaign.status)}</td>
                      <td className="py-3 pr-4">{campaign.participants}</td>
                      <td className="space-x-2 py-3 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={statusMutation.isPending || campaign.status === "ACTIVE"}
                          onClick={() => statusMutation.mutate({ id: campaign.id, status: "ACTIVE" })}
                        >
                          上线
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={statusMutation.isPending || campaign.status === "PAUSED"}
                          onClick={() => statusMutation.mutate({ id: campaign.id, status: "PAUSED" })}
                        >
                          下线
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
