"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Campaign {
  id: string;
  title: string;
  merchantName: string;
  startDate: string;
  endDate: string;
  status: string;
  participants: number;
}

async function fetchCampaigns(): Promise<Campaign[]> {
  return [
    {
      id: "1",
      title: "夏日寻宝大作战",
      merchantName: "星巴克",
      startDate: "2024-07-01",
      endDate: "2024-08-31",
      status: "ACTIVE",
      participants: 1234,
    },
    {
      id: "2",
      title: "国庆黄金周活动",
      merchantName: "屈臣氏",
      startDate: "2024-10-01",
      endDate: "2024-10-07",
      status: "PENDING",
      participants: 0,
    },
  ];
}

export default function PlatformCampaignsPage() {
  const { data: campaigns, isLoading } = useQuery({
    queryKey: ["platformCampaigns"],
    queryFn: fetchCampaigns,
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return (
          <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full">
            进行中
          </span>
        );
      case "PENDING":
        return (
          <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-700 rounded-full">
            待审核
          </span>
        );
      case "ENDED":
        return (
          <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-full">
            已结束
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">活动管理</h1>
        <p className="text-gray-600">管理所有活动</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>活动列表</CardTitle>
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
                      活动名称
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
                      商家
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
                      时间
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
                      状态
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
                      参与人数
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns?.map((campaign) => (
                    <tr key={campaign.id} className="border-b">
                      <td className="py-3 px-4 text-sm">{campaign.title}</td>
                      <td className="py-3 px-4 text-sm">
                        {campaign.merchantName}
                      </td>
                      <td className="py-3 px-4 text-sm">
                        {campaign.startDate} ~ {campaign.endDate}
                      </td>
                      <td className="py-3 px-4 text-sm">
                        {getStatusBadge(campaign.status)}
                      </td>
                      <td className="py-3 px-4 text-sm">
                        {campaign.participants}
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
