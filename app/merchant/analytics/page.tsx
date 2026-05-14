"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const stats = [
  { label: "今日参与", value: "156", change: "+12%" },
  { label: "今日完成任务", value: "89", change: "+8%" },
  { label: "今日发放奖励", value: "45", change: "+15%" },
  { label: "累计参与人数", value: "1,234", change: "+5%" },
];

const chartData = [
  { date: "周一", participants: 120 },
  { date: "周二", participants: 150 },
  { date: "周三", participants: 180 },
  { date: "周四", participants: 140 },
  { date: "周五", participants: 200 },
  { date: "周六", participants: 250 },
  { date: "周日", participants: 220 },
];

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">数据看板</h1>
        <p className="text-gray-600">查看活动数据统计</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <Card key={index}>
            <CardContent className="p-6">
              <p className="text-sm text-gray-600">{stat.label}</p>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-xs text-green-600">{stat.change} 较昨日</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle>本周参与趋势</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-end justify-around gap-2">
            {chartData.map((data, index) => (
              <div key={index} className="flex flex-col items-center gap-2">
                <div
                  className="w-12 bg-blue-500 rounded-t"
                  style={{ height: `${(data.participants / 250) * 100}%` }}
                ></div>
                <span className="text-xs text-gray-500">{data.date}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
