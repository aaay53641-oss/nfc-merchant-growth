"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const rules = [
  {
    title: "参与方式",
    content:
      "1. 前往指定门店，使用手机NFC功能扫描NFC卡片\n2. 进入活动页面，完成三关任务\n3. 每关任务完成后，提交相应凭证",
  },
  {
    title: "任务规则",
    content:
      "• 第一关：扫描NFC卡片，获取线索\n• 第二关：按照线索完成任务\n• 第三关：上传任务完成的凭证",
  },
  {
    title: "奖励规则",
    content:
      "• 完成一关：获得神秘小礼品\n• 完成两关：获得商家优惠券\n• 完成三关：获得惊喜大礼包",
  },
  {
    title: "兑换规则",
    content:
      "• 完成任务后，请在7天内兑换奖励\n• 兑换时请出示核销码\n• 最终解释权归活动主办方所有",
  },
];

export default function RulesPage() {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-gray-900 mb-4">活动规则</h2>

      {rules.map((rule, index) => (
        <Card key={index}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">
              {index + 1}. {rule.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 whitespace-pre-line">
              {rule.content}
            </p>
          </CardContent>
        </Card>
      ))}

      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <p className="text-sm text-blue-800">
            如有疑问，请联系客服：400-123-4567
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
