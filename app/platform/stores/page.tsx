"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Store {
  id: string;
  name: string;
  merchantName: string;
  address: string;
  nfcCardsCount: number;
  status: string;
}

async function fetchStores(): Promise<Store[]> {
  return [
    {
      id: "1",
      name: "星巴克-国贸店",
      merchantName: "星巴克",
      address: "北京市朝阳区建国门外大街1号",
      nfcCardsCount: 10,
      status: "ACTIVE",
    },
    {
      id: "2",
      name: "屈臣氏-王府井店",
      merchantName: "屈臣氏",
      address: "北京市东城区王府井大街138号",
      nfcCardsCount: 5,
      status: "ACTIVE",
    },
  ];
}

export default function PlatformStoresPage() {
  const { data: stores, isLoading } = useQuery({
    queryKey: ["platformStores"],
    queryFn: fetchStores,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">门店管理</h1>
        <p className="text-gray-600">管理所有门店</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>门店列表</CardTitle>
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
                      门店名称
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
                      商家
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
                      地址
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
                      NFC卡片数
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
                      状态
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {stores?.map((store) => (
                    <tr key={store.id} className="border-b">
                      <td className="py-3 px-4 text-sm">{store.name}</td>
                      <td className="py-3 px-4 text-sm">{store.merchantName}</td>
                      <td className="py-3 px-4 text-sm">{store.address}</td>
                      <td className="py-3 px-4 text-sm">
                        {store.nfcCardsCount}
                      </td>
                      <td className="py-3 px-4 text-sm">
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${
                            store.status === "ACTIVE"
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {store.status === "ACTIVE" ? "启用" : "禁用"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button variant="ghost" size="sm">
                          查看
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
