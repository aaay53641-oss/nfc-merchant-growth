"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Merchant {
  id: string;
  name: string;
  contact: string;
  phone: string;
  status: string;
  storesCount: number;
  createdAt: string;
}

async function fetchMerchants(): Promise<Merchant[]> {
  return [
    {
      id: "1",
      name: "星巴克",
      contact: "张经理",
      phone: "400-123-4567",
      status: "APPROVED",
      storesCount: 10,
      createdAt: "2024-01-15",
    },
    {
      id: "2",
      name: "屈臣氏",
      contact: "李经理",
      phone: "400-234-5678",
      status: "PENDING",
      storesCount: 0,
      createdAt: "2024-07-10",
    },
  ];
}

export default function MerchantsPage() {
  const { data: merchants, isLoading } = useQuery({
    queryKey: ["merchants"],
    queryFn: fetchMerchants,
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "APPROVED":
        return (
          <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full">
            已通过
          </span>
        );
      case "PENDING":
        return (
          <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-700 rounded-full">
            待审核
          </span>
        );
      case "REJECTED":
        return (
          <span className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded-full">
            已拒绝
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">商家管理</h1>
        <p className="text-gray-600">管理入驻商家</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>商家列表</CardTitle>
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
                      商家名称
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
                      联系人
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
                      联系电话
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
                      门店数
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
                      状态
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
                      入驻时间
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {merchants?.map((merchant) => (
                    <tr key={merchant.id} className="border-b">
                      <td className="py-3 px-4 text-sm">{merchant.name}</td>
                      <td className="py-3 px-4 text-sm">{merchant.contact}</td>
                      <td className="py-3 px-4 text-sm">{merchant.phone}</td>
                      <td className="py-3 px-4 text-sm">
                        {merchant.storesCount}
                      </td>
                      <td className="py-3 px-4 text-sm">
                        {getStatusBadge(merchant.status)}
                      </td>
                      <td className="py-3 px-4 text-sm">
                        {merchant.createdAt}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button variant="ghost" size="sm">
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
    </div>
  );
}
