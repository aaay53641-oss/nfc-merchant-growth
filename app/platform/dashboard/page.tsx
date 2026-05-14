"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const stats = [
  { label: "商家总数", value: "156", icon: "🏢" },
  { label: "门店总数", value: "423", icon: "🏪" },
  { label: "活动总数", value: "89", icon: "🎯" },
  { label: "参与用户", value: "12,345", icon: "👥" },
];

export default function PlatformDashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">数据总览</h1>
        <p className="text-gray-600">查看全平台数据统计</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <Card key={index}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stat.value}
                  </p>
                </div>
                <span className="text-3xl">{stat.icon}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>平台动态</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-sm text-gray-700">
                新商家\"星巴克\"申请入驻
              </span>
              <span className="text-xs text-gray-500">10分钟前</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-sm text-gray-700">
                活动\"夏日寻宝\"审核通过
              </span>
              <span className="text-xs text-gray-500">30分钟前</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-sm text-gray-700">
                新增NFC卡片100张
              </span>
              <span className="text-xs text-gray-500">1小时前</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
