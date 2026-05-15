"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";
import { CheckCircle2, Search, Ticket } from "lucide-react";

interface RedemptionInfo {
  code: string;
  status: string;
  userName: string;
  rewardName: string;
  rewardDescription: string;
  createdAt: string;
}

export default function VerifyPage() {
  const qc = useQueryClient();
  const [code, setCode] = useState("");
  const [searchCode, setSearchCode] = useState("");

  const { data: result, isLoading: searching } = useQuery<RedemptionInfo>({
    queryKey: ["verify-code", searchCode],
    queryFn: async () => {
      const res = await fetch(`/api/merchant/redemptions?code=${encodeURIComponent(searchCode)}`);
      if (!res.ok) throw new Error(await res.json().then((d) => d.error || "查找失败"));
      return res.json();
    },
    enabled: searchCode.length > 0,
  });

  const { data: history = [] } = useQuery<RedemptionInfo[]>({
    queryKey: ["redemption-history"],
    queryFn: async () => {
      const res = await fetch("/api/merchant/redemptions");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const redeemMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/merchant/redemptions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: result!.code }),
      });
      if (!res.ok) throw new Error(await res.json().then((d) => d.error || "核销失败"));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["verify-code", searchCode] });
      qc.invalidateQueries({ queryKey: ["redemption-history"] });
      toast({ title: "核销成功", description: `核销码 ${searchCode} 已标记为已使用` });
    },
    onError: (err: Error) => {
      toast({ title: "核销失败", description: err.message });
    },
  });

  const handleSearch = () => {
    setSearchCode(code.trim().toUpperCase());
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">核销管理</h2>

      <Card>
        <CardContent className="space-y-4 p-6">
          <div className="flex gap-2">
            <Input
              placeholder="输入核销码"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="font-mono"
            />
            <Button onClick={handleSearch} disabled={!code.trim()}>
              <Search className="mr-2 size-4" />查询
            </Button>
          </div>

          {searching ? (
            <div className="flex justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            </div>
          ) : result ? (
            <div className="rounded-lg border bg-slate-50 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-mono text-lg font-bold">{result.code}</p>
                  <p className="text-sm text-slate-500">用户：{result.userName}</p>
                </div>
                <Badge variant={result.status === "USED" ? "success" : "warning"}>
                  {result.status === "USED" ? "已核销" : "待核销"}
                </Badge>
              </div>
              <div className="mt-3 space-y-1 text-sm">
                <p>奖励：{result.rewardName}</p>
                <p className="text-slate-500">{result.rewardDescription}</p>
                <p className="text-xs text-slate-400">领取时间：{new Date(result.createdAt).toLocaleString("zh-CN")}</p>
              </div>
              {result.status !== "USED" ? (
                <Button className="mt-4 w-full" onClick={() => redeemMutation.mutate()}>
                  <CheckCircle2 className="mr-2 size-4" />确认核销
                </Button>
              ) : null}
            </div>
          ) : searchCode ? (
            <p className="py-4 text-center text-sm text-red-500">未找到核销码</p>
          ) : null}
        </CardContent>
      </Card>

      <div>
        <h3 className="mb-3 text-lg font-semibold">核销记录</h3>
        {history.length === 0 ? (
          <Card><CardContent className="py-8 text-center text-slate-500">暂无核销记录</CardContent></Card>
        ) : (
          <div className="space-y-2">
            {history.map((item) => (
              <Card key={item.code}>
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <Ticket className="size-5 text-slate-400" />
                    <div>
                      <p className="font-mono text-sm font-semibold">{item.code}</p>
                      <p className="text-xs text-slate-500">{item.userName} · {item.rewardName}</p>
                    </div>
                  </div>
                  <Badge variant={item.status === "USED" ? "success" : "warning"}>
                    {item.status === "USED" ? "已核销" : "待核销"}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
