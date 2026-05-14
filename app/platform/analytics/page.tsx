"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const stats = [
  { label: "总商家数", value: "156", change: "+5%" },
  { label: "总门店数", value: "423", change: "+3%" },
  { label: "总活动数", value: "89", change: "+12%" },
  { label: "总参与用户", value: "12,345", change: "+8%" },
  { label: "总完成任务", value: "34,567", change: "+15%" },
  { label: "总发放奖励", value: "9,876", change: "+10%" },
];

const topMerchants = [
  { name: "星巴克", participants: 5000, campaigns: 5 },
  { name: "屈臣氏", participants: 3500, campaigns: 3 },
  { name: "麦当劳", participants: 2800, campaigns: 4 },
];

export default function PlatformAnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">数据总览</h1>
        <p className="text-gray-600">全平台数据统计</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map((stat, index) => (
          <Card key={index}>
            <CardContent className="p-6">
              <p className="text-sm text-gray-600">{stat.label}</p>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-xs text-green-600">{stat.change} 较上月</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Top商家</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topMerchants.map((merchant, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <div>
                    <p className="font-medium">{merchant.name}</p>
                    <p className="text-sm text-gray-500">
                      {merchant.campaigns}个活动
                    </p>
                  </div>
                  <span className="text-lg font-bold text-blue-600">
                    {merchant.participants.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>活动类型分布</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">寻宝类</span>
                <div className="flex items-center gap-2">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full"
                      style={{ width: "60%" }}
                    ></div>
                  </div>
                  <span className="text-sm">60%</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">打卡类</span>
                <div className="flex items-center gap-2">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full"
                      style={{ width: "25%" }}
                    ></div>
                  </div>
                  <span className="text-sm">25%</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">分享类</span>
                <div className="flex items-center gap-2">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-purple-500 h-2 rounded-full"
                      style={{ width: "15%" }}
                    ></div>
                  </div>
                  <span className="text-sm">15%</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
