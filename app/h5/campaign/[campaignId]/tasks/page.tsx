"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Task {
  id: string;
  title: string;
  description: string;
  type: string;
  status: string;
  order: number;
}

async function fetchTasks(campaignId: string): Promise<Task[]> {
  return [
    {
      id: "1",
      title: "第一关：NFC扫描",
      description: "使用手机NFC功能扫描门店NFC卡片",
      type: "NFC_SCAN",
      status: "COMPLETED",
      order: 1,
    },
    {
      id: "2",
      title: "第二关：拍照打卡",
      description: "拍摄门店照片并上传",
      type: "UPLOAD_IMAGE",
      status: "IN_PROGRESS",
      order: 2,
    },
    {
      id: "3",
      title: "第三关：分享传播",
      description: "分享活动到社交媒体",
      type: "SHARE_LINK",
      status: "LOCKED",
      order: 3,
    },
  ];
}

export default function TasksPage() {
  const campaignId = "1";

  const { data: tasks, isLoading } = useQuery({
    queryKey: ["tasks", campaignId],
    queryFn: () => fetchTasks(campaignId),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return (
          <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full">
            已完成
          </span>
        );
      case "IN_PROGRESS":
        return (
          <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full">
            进行中
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

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-gray-900 mb-4">三关任务</h2>

      <div className="space-y-4">
        {tasks?.map((task, index) => (
          <Card key={task.id} className={task.status === "LOCKED" ? "opacity-60" : ""}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  <span
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      task.status === "COMPLETED"
                        ? "bg-green-500 text-white"
                        : task.status === "IN_PROGRESS"
                        ? "bg-blue-500 text-white"
                        : "bg-gray-300 text-gray-600"
                    }`}
                  >
                    {index + 1}
                  </span>
                  {task.title}
                </CardTitle>
                {getStatusBadge(task.status)}
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">{task.description}</p>
              {task.status === "IN_PROGRESS" && (
                <Button className="w-full">去完成</Button>
              )}
              {task.status === "COMPLETED" && (
                <Button variant="outline" className="w-full" disabled>
                  已完成
                </Button>
              )}
              {task.status === "LOCKED" && (
                <Button variant="secondary" className="w-full" disabled>
                  先完成上一关
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
