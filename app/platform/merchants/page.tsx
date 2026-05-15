"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";

type Merchant = {
  id: string;
  name: string;
  description: string | null;
  contact: string | null;
  phone: string | null;
  address: string | null;
  businessLicense: string | null;
  legalPerson: string | null;
  status: string;
  reviewNote: string | null;
  storesCount: number;
  createdAt: string;
};

async function fetchMerchants(): Promise<Merchant[]> {
  const response = await fetch("/api/platform/merchants");
  if (!response.ok) throw new Error("Failed to load merchants");
  const data = await response.json();
  return data.merchants;
}

function statusBadge(status: string) {
  if (status === "APPROVED" || status === "ACTIVE") {
    return <Badge variant="success">已通过</Badge>;
  }
  if (status === "REJECTED") {
    return <Badge variant="warning">已拒绝</Badge>;
  }
  if (status === "INACTIVE") {
    return <Badge variant="muted">已停用</Badge>;
  }
  return <Badge variant="secondary">待审核</Badge>;
}

export default function MerchantsPage() {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<Merchant | null>(null);
  const [reviewNote, setReviewNote] = useState("");

  const { data: merchants, isLoading } = useQuery({
    queryKey: ["platform-merchants"],
    queryFn: fetchMerchants,
  });

  const reviewMutation = useMutation({
    mutationFn: async (input: { id: string; status: "APPROVED" | "REJECTED"; reviewNote?: string }) => {
      const response = await fetch(`/api/platform/merchants/${input.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: input.status, reviewNote: input.reviewNote }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error ?? "审核失败");
      }
      return response.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["platform-merchants"] });
      toast({ title: "审核状态已更新" });
      setSelected(null);
      setReviewNote("");
    },
    onError: (error) => {
      toast({ title: "审核失败", description: error.message });
    },
  });

  const submitReview = (status: "APPROVED" | "REJECTED") => {
    if (!selected) return;
    reviewMutation.mutate({
      id: selected.id,
      status,
      reviewNote: status === "REJECTED" ? reviewNote : undefined,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-950">商家管理</h1>
        <p className="text-sm text-slate-500">审核入驻资质并查看商家基础信息。</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>商家列表</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center text-sm text-slate-500">加载中...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-slate-500">
                    <th className="py-3 pr-4 font-medium">商家名称</th>
                    <th className="py-3 pr-4 font-medium">联系方式</th>
                    <th className="py-3 pr-4 font-medium">状态</th>
                    <th className="py-3 pr-4 font-medium">门店数</th>
                    <th className="py-3 pr-4 font-medium">注册时间</th>
                    <th className="py-3 text-right font-medium">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {(merchants ?? []).map((merchant) => (
                    <tr key={merchant.id} className="border-b last:border-0">
                      <td className="py-3 pr-4 font-medium">{merchant.name}</td>
                      <td className="py-3 pr-4 text-slate-600">
                        {merchant.contact ?? "-"} / {merchant.phone ?? "-"}
                      </td>
                      <td className="py-3 pr-4">{statusBadge(merchant.status)}</td>
                      <td className="py-3 pr-4">{merchant.storesCount}</td>
                      <td className="py-3 pr-4">{merchant.createdAt.slice(0, 10)}</td>
                      <td className="py-3 text-right">
                        <Button variant="outline" size="sm" onClick={() => setSelected(merchant)}>
                          审核
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

      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>商家资质审核</DialogTitle>
            <DialogDescription>{selected?.name}</DialogDescription>
          </DialogHeader>
          {selected ? (
            <div className="space-y-4">
              <div className="grid gap-3 rounded-md border p-3 text-sm">
                <div><Label>法人</Label><p>{selected.legalPerson ?? "-"}</p></div>
                <div><Label>营业执照</Label><p className="break-all">{selected.businessLicense ?? "-"}</p></div>
                <div><Label>联系人</Label><p>{selected.contact ?? "-"} / {selected.phone ?? "-"}</p></div>
                <div><Label>地址</Label><p>{selected.address ?? "-"}</p></div>
                <div><Label>简介</Label><p>{selected.description ?? "-"}</p></div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="reviewNote">拒绝理由</Label>
                <textarea
                  id="reviewNote"
                  className="min-h-24 w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-300"
                  value={reviewNote}
                  onChange={(event) => setReviewNote(event.target.value)}
                  placeholder="拒绝时必填"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  type="button"
                  disabled={reviewMutation.isPending}
                  onClick={() => submitReview("REJECTED")}
                >
                  拒绝
                </Button>
                <Button
                  type="button"
                  disabled={reviewMutation.isPending}
                  onClick={() => submitReview("APPROVED")}
                >
                  通过
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
