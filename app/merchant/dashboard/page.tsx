"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const stats = [
  { label: "总活动数", value: "12", icon: "🎯" },
  { label: "参与人数", value: "1,234", icon: "👥" },
  { label: "完成任务数", value: "3,456", icon: "✅" },
  { label: "发放奖励数", value: "789", icon: "🎁" },
];

const recentActivities = [
  { id: 1, content: "用户张三完成了第一关任务", time: "10分钟前" },
  { id: 2, content: "新活动\"夏日寻宝\"已审核通过", time: "30分钟前" },
  { id: 3, content: "用户李四领取了优惠券", time: "1小时前" },
  { id: 4, content: "新增NFC卡片绑定门店A", time: "2小时前" },
];

export default function MerchantDashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">数据看板</h1>
        <p className="text-gray-600">欢迎回来，查看您的业务概览</p>
      </div>

      {/* Stats Cards */}
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

      {/* Recent Activities */}
      <Card>
        <CardHeader>
          <CardTitle>最近活动</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentActivities.map((activity) => (
              <div
                key={activity.id}
                className="flex items-center justify-between py-2 border-b last:border-0"
              >
                <span className="text-sm text-gray-700">
                  {activity.content}
                </span>
                <span className="text-xs text-gray-500">{activity.time}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
