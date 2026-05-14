"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface NfcCard {
  id: string;
  code: string;
  storeName: string;
  merchantName: string;
  status: string;
  createdAt: string;
}

async function fetchNfcCards(): Promise<NfcCard[]> {
  return [
    {
      id: "1",
      code: "NFC-001-001",
      storeName: "星巴克-国贸店",
      merchantName: "星巴克",
      status: "ACTIVE",
      createdAt: "2024-07-01",
    },
    {
      id: "2",
      code: "NFC-001-002",
      storeName: "星巴克-国贸店",
      merchantName: "星巴克",
      status: "USED",
      createdAt: "2024-07-01",
    },
    {
      id: "3",
      code: "NFC-002-001",
      storeName: "屈臣氏-王府井店",
      merchantName: "屈臣氏",
      status: "ACTIVE",
      createdAt: "2024-07-05",
    },
  ];
}

export default function NfcCardsPage() {
  const { data: cards, isLoading } = useQuery({
    queryKey: ["nfcCards"],
    queryFn: fetchNfcCards,
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return (
          <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full">
            正常
          </span>
        );
      case "USED":
        return (
          <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-full">
            已使用
          </span>
        );
      case "LOST":
        return (
          <span className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded-full">
            挂失
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">NFC卡管理</h1>
          <p className="text-gray-600">管理所有NFC卡片</p>
        </div>
        <Button>生成NFC卡</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>NFC卡列表</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">加载中...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
                      卡号
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
                      门店
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
                      商家
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
                      状态
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
                      创建时间
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {cards?.map((card) => (
                    <tr key={card.id} className="border-b">
                      <td className="py-3 px-4 text-sm font-mono">
                        {card.code}
                      </td>
                      <td className="py-3 px-4 text-sm">{card.storeName}</td>
                      <td className="py-3 px-4 text-sm">
                        {card.merchantName}
                      </td>
                      <td className="py-3 px-4 text-sm">
                        {getStatusBadge(card.status)}
                      </td>
                      <td className="py-3 px-4 text-sm">{card.createdAt}</td>
                      <td className="py-3 px-4 text-right">
                        <Button variant="ghost" size="sm">
                          详情
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
