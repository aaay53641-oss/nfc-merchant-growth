"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Submission {
  id: string;
  userId: string;
  taskTitle: string;
  content: string;
  imageUrl: string | null;
  status: string;
  createdAt: string;
}

async function fetchSubmissions(): Promise<Submission[]> {
  return [
    {
      id: "1",
      userId: "user_001",
      taskTitle: "拍照打卡任务",
      content: "门店照片",
      imageUrl: null,
      status: "PENDING",
      createdAt: "2024-07-15 10:30",
    },
    {
      id: "2",
      userId: "user_002",
      taskTitle: "分享任务",
      content: "https://example.com/share/123",
      imageUrl: null,
      status: "PENDING",
      createdAt: "2024-07-15 11:00",
    },
  ];
}

export default function ReviewsPage() {
  const { data: submissions, isLoading } = useQuery({
    queryKey: ["submissions"],
    queryFn: fetchSubmissions,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">审核管理</h1>
        <p className="text-gray-600">审核用户提交的任务凭证</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>待审核列表</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">加载中...</div>
          ) : (
            <div className="space-y-4">
              {submissions?.map((submission) => (
                <div
                  key={submission.id}
                  className="p-4 border rounded-lg space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium">{submission.taskTitle}</span>
                      <span className="text-sm text-gray-500 ml-2">
                        用户: {submission.userId}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">
                      {submission.createdAt}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700">{submission.content}</p>
                  {submission.imageUrl && (
                    <img
                      src={submission.imageUrl}
                      alt="提交图片"
                      className="max-h-32 rounded"
                    />
                  )}
                  <div className="flex gap-2">
                    <Button size="sm">通过</Button>
                    <Button size="sm" variant="destructive">
                      拒绝
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
