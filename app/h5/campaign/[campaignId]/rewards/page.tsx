"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Reward {
  id: string;
  name: string;
  description: string;
  type: string;
  status: string;
  code: string | null;
}

async function fetchRewards(campaignId: string): Promise<Reward[]> {
  return [
    {
      id: "1",
      name: "神秘小礼品",
      description: "完成第一关即可领取",
      type: "GIFT",
      status: "CLAIMED",
      code: "GIFT-2024-001",
    },
    {
      id: "2",
      name: "商家优惠券",
      description: "完成第二关即可领取，满100减20",
      type: "COUPON",
      status: "AVAILABLE",
      code: null,
    },
    {
      id: "3",
      name: "惊喜大礼包",
      description: "完成全部三关即可领取",
      type: "GIFT",
      status: "LOCKED",
      code: null,
    },
  ];
}

export default function RewardsPage() {
  const campaignId = "1";
  const [selectedReward, setSelectedReward] = useState<Reward | null>(null);

  const { data: rewards, isLoading } = useQuery({
    queryKey: ["rewards", campaignId],
    queryFn: () => fetchRewards(campaignId),
  });

  const handleClaim = (reward: Reward) => {
    setSelectedReward(reward);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "CLAIMED":
        return (
          <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full">
            已领取
          </span>
        );
      case "AVAILABLE":
        return (
          <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full">
            可领取
          </span>
        );
      case "LOCKED":
        return (
          <span className="px-2 py-1 text-xs bg-gray-100 text-gray-500 rounded-full">
            未解锁
          </span>
        );
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-gray-900 mb-4">奖励领取</h2>

      <div className="space-y-4">
        {rewards?.map((reward) => (
          <Card key={reward.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-medium">
                  {reward.name}
                </CardTitle>
                {getStatusBadge(reward.status)}
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">{reward.description}</p>
              {reward.status === "AVAILABLE" && (
                <Button className="w-full" onClick={() => handleClaim(reward)}>
                  领取奖励
                </Button>
              )}
              {reward.status === "CLAIMED" && (
                <div className="space-y-2">
                  <div className="p-3 bg-gray-100 rounded-lg">
                    <p className="text-xs text-gray-500 mb-1">核销码</p>
                    <p className="text-lg font-mono font-bold">{reward.code}</p>
                  </div>
                  <Button variant="outline" className="w-full">
                    复制核销码
                  </Button>
                </div>
              )}
              {reward.status === "LOCKED" && (
                <Button variant="secondary" className="w-full" disabled>
                  完成更多任务解锁
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
