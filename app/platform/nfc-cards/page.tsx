"use client";

import { useQuery } from "@tanstack/react-query";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type NfcCard = {
  id: string;
  code: string;
  tableNumber: string | null;
  status: "ACTIVE" | "USED" | "LOST";
  storeName: string;
  merchantName: string;
  campaignTitle: string | null;
  createdAt: string;
};

async function fetchNfcCards(): Promise<NfcCard[]> {
  const response = await fetch("/api/platform/nfc-cards");
  if (!response.ok) throw new Error("Failed to load nfc cards");
  const data = await response.json();
  return data.cards;
}

function statusBadge(status: NfcCard["status"]) {
  if (status === "ACTIVE") return <Badge variant="success">正常</Badge>;
  if (status === "USED") return <Badge variant="secondary">已使用</Badge>;
  return <Badge variant="warning">挂失</Badge>;
}

export default function NfcCardsPage() {
  const { data: cards, isLoading } = useQuery({
    queryKey: ["platform-nfc-cards"],
    queryFn: fetchNfcCards,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-950">NFC卡管理</h1>
        <p className="text-sm text-slate-500">平台只读查看所有 NFC 卡和绑定活动。</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>NFC卡列表</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center text-sm text-slate-500">加载中...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-slate-500">
                    <th className="py-3 pr-4 font-medium">卡号</th>
                    <th className="py-3 pr-4 font-medium">商家/门店</th>
                    <th className="py-3 pr-4 font-medium">活动</th>
                    <th className="py-3 pr-4 font-medium">桌号</th>
                    <th className="py-3 pr-4 font-medium">状态</th>
                    <th className="py-3 pr-4 font-medium">创建时间</th>
                  </tr>
                </thead>
                <tbody>
                  {(cards ?? []).map((card) => (
                    <tr key={card.id} className="border-b last:border-0">
                      <td className="py-3 pr-4 font-mono">{card.code}</td>
                      <td className="py-3 pr-4">
                        {card.merchantName}
                        <p className="text-xs text-slate-500">{card.storeName}</p>
                      </td>
                      <td className="py-3 pr-4">{card.campaignTitle ?? "-"}</td>
                      <td className="py-3 pr-4">{card.tableNumber ?? "-"}</td>
                      <td className="py-3 pr-4">{statusBadge(card.status)}</td>
                      <td className="py-3 pr-4">{card.createdAt.slice(0, 10)}</td>
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
