"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/use-toast";

type StoreItem = {
  id: string;
  name: string;
  merchantName: string;
  address: string | null;
  phone: string | null;
  status: "ACTIVE" | "INACTIVE";
  nfcCardsCount: number;
  campaignsCount: number;
};

async function fetchStores(): Promise<StoreItem[]> {
  const response = await fetch("/api/platform/stores");
  if (!response.ok) throw new Error("Failed to load stores");
  const data = await response.json();
  return data.stores;
}

export default function PlatformStoresPage() {
  const queryClient = useQueryClient();
  const { data: stores, isLoading } = useQuery({
    queryKey: ["platform-stores"],
    queryFn: fetchStores,
  });

  const statusMutation = useMutation({
    mutationFn: async (input: { id: string; status: "ACTIVE" | "INACTIVE" }) => {
      const response = await fetch(`/api/platform/stores/${input.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: input.status }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error ?? "更新门店状态失败");
      }
      return response.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["platform-stores"] });
      toast({ title: "门店状态已更新" });
    },
    onError: (error) => toast({ title: "更新失败", description: error.message }),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-950">门店管理</h1>
        <p className="text-sm text-slate-500">查看全平台门店并执行停用/恢复。</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>门店列表</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center text-sm text-slate-500">加载中...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-slate-500">
                    <th className="py-3 pr-4 font-medium">门店</th>
                    <th className="py-3 pr-4 font-medium">商家</th>
                    <th className="py-3 pr-4 font-medium">地址</th>
                    <th className="py-3 pr-4 font-medium">状态</th>
                    <th className="py-3 pr-4 font-medium">活动/NFC</th>
                    <th className="py-3 text-right font-medium">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {(stores ?? []).map((store) => (
                    <tr key={store.id} className="border-b last:border-0">
                      <td className="py-3 pr-4 font-medium">
                        {store.name}
                        <p className="text-xs font-normal text-slate-500">{store.phone ?? "-"}</p>
                      </td>
                      <td className="py-3 pr-4">{store.merchantName}</td>
                      <td className="py-3 pr-4 text-slate-600">{store.address ?? "-"}</td>
                      <td className="py-3 pr-4">
                        {store.status === "ACTIVE" ? (
                          <Badge variant="success">启用</Badge>
                        ) : (
                          <Badge variant="muted">停用</Badge>
                        )}
                      </td>
                      <td className="py-3 pr-4">
                        {store.campaignsCount} / {store.nfcCardsCount}
                      </td>
                      <td className="py-3 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={statusMutation.isPending}
                          onClick={() =>
                            statusMutation.mutate({
                              id: store.id,
                              status: store.status === "ACTIVE" ? "INACTIVE" : "ACTIVE",
                            })
                          }
                        >
                          {store.status === "ACTIVE" ? "停用" : "恢复"}
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
