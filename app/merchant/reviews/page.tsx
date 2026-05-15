"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import { CheckCircle2, ExternalLink, Eye, XCircle } from "lucide-react";

interface ReviewItem {
  id: string;
  userName: string;
  taskTitle: string;
  content: string | null;
  imageUrls: string[];
  platformLink: string | null;
  status: string;
  submittedAt: string;
}

export default function ReviewsPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<"pending" | "done">("pending");
  const [viewItem, setViewItem] = useState<ReviewItem | null>(null);
  const [reviewNote, setReviewNote] = useState("");

  const { data: reviews = [], isLoading } = useQuery<ReviewItem[]>({
    queryKey: ["merchant-reviews", filter],
    queryFn: async () => {
      const res = await fetch(`/api/merchant/reviews?filter=${filter}`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const reviewMutation = useMutation({
    mutationFn: async ({ id, status, note }: { id: string; status: string; note?: string }) => {
      const res = await fetch(`/api/submissions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, reviewNote: note }),
      });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["merchant-reviews"] });
      setViewItem(null);
      toast({ title: "审核完成" });
    },
  });

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">凭证审核</h2>
        <div className="flex gap-2">
          <Button variant={filter === "pending" ? "default" : "outline"} size="sm" onClick={() => setFilter("pending")}>待审核</Button>
          <Button variant={filter === "done" ? "default" : "outline"} size="sm" onClick={() => setFilter("done")}>已审核</Button>
        </div>
      </div>

      {reviews.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-slate-500">{filter === "pending" ? "暂无待审核凭证" : "暂无审核记录"}</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {reviews.map((item) => (
            <Card key={item.id}>
              <CardContent className="flex items-center justify-between p-4">
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{item.userName}</span>
                    <span className="text-sm text-slate-500">· {item.taskTitle}</span>
                    <Badge variant={item.status === "SUBMITTED" ? "warning" : item.status === "APPROVED" ? "success" : "secondary"}>
                      {item.status === "SUBMITTED" ? "待审核" : item.status === "APPROVED" ? "已通过" : "已驳回"}
                    </Badge>
                  </div>
                  {item.content ? <p className="truncate text-sm text-slate-600">{item.content}</p> : null}
                  <p className="text-xs text-slate-400">{new Date(item.submittedAt).toLocaleString("zh-CN")}</p>
                </div>
                <div className="ml-4 flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setViewItem(item)}><Eye className="mr-1 size-4" />查看</Button>
                  {filter === "pending" ? (
                    <>
                      <Button size="sm" onClick={() => reviewMutation.mutate({ id: item.id, status: "APPROVED" })}>
                        <CheckCircle2 className="mr-1 size-4" />通过
                      </Button>
                    </>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={Boolean(viewItem)} onOpenChange={(open) => !open && setViewItem(null)}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>凭证详情</DialogTitle></DialogHeader>
          {viewItem ? (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium">用户：{viewItem.userName}</p>
                <p className="text-sm text-slate-500">任务：{viewItem.taskTitle}</p>
                <p className="text-sm text-slate-500">提交时间：{new Date(viewItem.submittedAt).toLocaleString("zh-CN")}</p>
              </div>
              {viewItem.content ? (
                <div><Label>文字内容</Label><p className="mt-1 rounded-md bg-slate-50 p-3 text-sm">{viewItem.content}</p></div>
              ) : null}
              {viewItem.imageUrls.length > 0 ? (
                <div><Label>凭证图片</Label><div className="mt-2 grid grid-cols-2 gap-2">{viewItem.imageUrls.map((url) => <img key={url} src={url} alt="" className="rounded-md border object-cover" />)}</div></div>
              ) : null}
              {viewItem.platformLink ? (
                <div><Label>发布链接</Label><a href={viewItem.platformLink} target="_blank" rel="noopener noreferrer" className="mt-1 flex items-center gap-1 text-sm text-blue-600 underline"><ExternalLink className="size-4" />{viewItem.platformLink}</a></div>
              ) : null}
              {viewItem.status === "SUBMITTED" ? (
                <div className="space-y-3 border-t pt-4">
                  <Input placeholder="驳回理由（驳回时必填）" value={reviewNote} onChange={(e) => setReviewNote(e.target.value)} />
                  <div className="flex gap-2">
                    <Button className="flex-1" onClick={() => reviewMutation.mutate({ id: viewItem.id, status: "APPROVED" })}>通过</Button>
                    <Button variant="destructive" className="flex-1" onClick={() => reviewMutation.mutate({ id: viewItem.id, status: "REJECTED", note: reviewNote })} disabled={!reviewNote.trim()}>驳回</Button>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
