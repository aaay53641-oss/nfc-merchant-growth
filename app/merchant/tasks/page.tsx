"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const tasks = [
  {
    id: "1",
    title: "NFC扫描任务",
    description: "引导用户扫描NFC卡片",
    type: "NFC_SCAN",
    campaign: "夏日寻宝大作战",
  },
  {
    id: "2",
    title: "拍照打卡任务",
    description: "引导用户拍摄门店照片",
    type: "UPLOAD_IMAGE",
    campaign: "夏日寻宝大作战",
  },
  {
    id: "3",
    title: "分享任务",
    description: "引导用户分享活动到社交媒体",
    type: "SHARE_LINK",
    campaign: "夏日寻宝大作战",
  },
];

export default function TasksPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">任务配置</h1>
          <p className="text-gray-600">管理活动任务</p>
        </div>
        <Button>添加任务</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>任务列表</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div>
                  <h3 className="font-medium text-gray-900">{task.title}</h3>
                  <p className="text-sm text-gray-600">{task.description}</p>
                  <span className="text-xs text-gray-500">{task.campaign}</span>
                </div>
                <Button variant="ghost" size="sm">
                  编辑
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
