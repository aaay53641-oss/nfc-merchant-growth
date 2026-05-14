"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const rewards = [
  {
    id: "1",
    name: "神秘小礼品",
    type: "GIFT",
    campaign: "夏日寻宝大作战",
    total: 100,
    claimed: 45,
  },
  {
    id: "2",
    name: "商家优惠券",
    type: "COUPON",
    campaign: "夏日寻宝大作战",
    total: 200,
    claimed: 120,
  },
  {
    id: "3",
    name: "惊喜大礼包",
    type: "GIFT",
    campaign: "夏日寻宝大作战",
    total: 50,
    claimed: 30,
  },
];

export default function RewardsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">奖励配置</h1>
          <p className="text-gray-600">管理活动奖励</p>
        </div>
        <Button>添加奖励</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>奖励列表</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
                    奖励名称
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
                    类型
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
                    所属活动
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
                    发放/领取
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody>
                {rewards.map((reward) => (
                  <tr key={reward.id} className="border-b">
                    <td className="py-3 px-4 text-sm">{reward.name}</td>
                    <td className="py-3 px-4 text-sm">
                      {reward.type === "GIFT" ? "实物" : "优惠券"}
                    </td>
                    <td className="py-3 px-4 text-sm">{reward.campaign}</td>
                    <td className="py-3 px-4 text-sm">
                      {reward.claimed} / {reward.total}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Button variant="ghost" size="sm">
                        编辑
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
