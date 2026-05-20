"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Link2, Star, XCircle } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";

type StepSubmission = {
  id: string;
  userId: string;
  taskTitle: string;
  method: "STAFF_CONFIRM" | "LINK" | "SCREENSHOT";
  platform: string | null;
  link: string | null;
  screenshotUrl: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  reviewNote: string | null;
  qualityScore: number | null;
  lotteryChances: number;
  submittedAt: string;
  content: string | null;
  imageUrls: string[];
  platformLink: string | null;
};

type ScoreState = {
  clarity: number;
  relevance: number;
  completeness: number;
  authenticity: number;
  expression: number;
  reviewNote: string;
};

const scoreDefaults: ScoreState = {
  clarity: 16,
  relevance: 16,
  completeness: 16,
  authenticity: 16,
  expression: 16,
  reviewNote: "",
};

async function apiRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  const body = await response.json().catch(() => null);
  if (!response.ok || !body?.success) {
    throw new Error(body?.error ?? "请求失败");
  }
  return body.data as T;
}

function statusVariant(status: StepSubmission["status"]) {
  if (status === "APPROVED") return "success" as const;
  if (status === "REJECTED") return "outline" as const;
  return "warning" as const;
}

function statusLabel(status: StepSubmission["status"]) {
  if (status === "APPROVED") return "已通过";
  if (status === "REJECTED") return "已驳回";
  return "待审核";
}

function methodLabel(method: StepSubmission["method"]) {
  if (method === "STAFF_CONFIRM") return "店员确认";
  if (method === "LINK") return "链接提交";
  return "截图提交";
}

function totalScore(score: ScoreState) {
  return score.clarity + score.relevance + score.completeness + score.authenticity + score.expression;
}

export function CampaignSubmissionCenter({ campaignId, step }: { campaignId: string; step: 2 | 3 }) {
  const queryClient = useQueryClient();
  const [scores, setScores] = useState<Record<string, ScoreState>>({});
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const endpoint = `/api/merchant/campaigns/${campaignId}/submissions/step${step}`;
  const title = step === 2 ? "第二关确认中心" : "第三关审核中心";

  const { data, isLoading } = useQuery({
    queryKey: ["merchant-step-submissions", campaignId, step],
    queryFn: () => apiRequest<{ submissions: StepSubmission[] }>(endpoint),
  });
  const submissions = data?.submissions ?? [];

  const reviewMutation = useMutation({
    mutationFn: (payload: {
      verificationId: string;
      status: "APPROVED" | "REJECTED";
      reviewNote?: string;
      qualityScore?: number;
      qualityBreakdown?: Record<string, number>;
    }) => apiRequest(endpoint, { method: "PATCH", body: JSON.stringify(payload) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["merchant-step-submissions", campaignId, step] });
      toast({ title: "审核结果已保存" });
    },
    onError: (error) => {
      toast({ title: "审核失败", description: error instanceof Error ? error.message : "请稍后重试" });
    },
  });

  const approveStep2 = (item: StepSubmission) => {
    reviewMutation.mutate({ verificationId: item.id, status: "APPROVED" });
  };

  const rejectStep2 = (item: StepSubmission) => {
    const reason = (reviewNotes[item.id] ?? item.reviewNote ?? "链接或截图无法确认真实发布").trim();
    reviewMutation.mutate({ verificationId: item.id, status: "REJECTED", reviewNote: reason });
  };

  const approveStep3 = (item: StepSubmission) => {
    const score = scores[item.id] ?? scoreDefaults;
    const qualityScore = totalScore(score);
    reviewMutation.mutate({
      verificationId: item.id,
      status: qualityScore >= 60 ? "APPROVED" : "REJECTED",
      reviewNote: score.reviewNote,
      qualityScore,
      qualityBreakdown: {
        clarity: score.clarity,
        relevance: score.relevance,
        completeness: score.completeness,
        authenticity: score.authenticity,
        expression: score.expression,
      },
    });
  };

  const updateScore = (id: string, key: keyof ScoreState, value: string) => {
    setScores((current) => ({
      ...current,
      [id]: {
        ...(current[id] ?? scoreDefaults),
        [key]: key === "reviewNote" ? value : Math.max(0, Math.min(20, Number(value || 0))),
      },
    }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-950">{title}</h1>
        <p className="mt-1 text-sm text-slate-500">
          {step === 2 ? "处理用户点评链接、截图和店员现场确认。" : "按清晰度、相关性、完整度、真实感和表达质量评分。"}
        </p>
      </div>

      {isLoading ? (
        <Card><CardContent className="p-6 text-sm text-slate-500">加载审核记录中...</CardContent></Card>
      ) : submissions.length === 0 ? (
        <Card className="border-dashed"><CardContent className="p-6 text-sm text-slate-500">暂无提交记录。</CardContent></Card>
      ) : (
        <div className="grid gap-4">
          {submissions.map((item) => {
            const score = scores[item.id] ?? scoreDefaults;
            const currentScore = item.qualityScore ?? totalScore(score);
            return (
              <Card key={item.id} className="overflow-hidden">
                <CardHeader className="flex flex-row items-start justify-between gap-4 border-b bg-slate-50/70">
                  <div>
                    <CardTitle className="text-base">{item.taskTitle}</CardTitle>
                    <p className="mt-1 text-xs text-slate-500">
                      {item.userId} · {methodLabel(item.method)} · {new Date(item.submittedAt).toLocaleString("zh-CN")}
                    </p>
                  </div>
                  <Badge variant={statusVariant(item.status)}>{statusLabel(item.status)}</Badge>
                </CardHeader>
                <CardContent className="grid gap-4 p-4 lg:grid-cols-[1fr_320px]">
                  <div className="space-y-3">
                    <div className="rounded-2xl border bg-white p-3 text-sm leading-6 text-slate-600">
                      <p>平台：{item.platform || "未指定"}</p>
                      <p>内容：{item.content || "无文本内容"}</p>
                      {item.platformLink ? (
                        <a className="mt-2 inline-flex items-center gap-1 text-brand-orange hover:underline" href={item.platformLink} target="_blank" rel="noreferrer">
                          <Link2 className="size-4" />
                          打开提交链接
                        </a>
                      ) : null}
                    </div>
                    <div className="grid gap-2 sm:grid-cols-3">
                      {[item.screenshotUrl, ...item.imageUrls].filter((url): url is string => Boolean(url)).map((url, index) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img key={`${url}-${index}`} src={url} alt="提交截图" className="aspect-video rounded-2xl border object-cover" />
                      ))}
                    </div>
                    {item.reviewNote ? (
                      <p className="rounded-2xl bg-red-50 p-3 text-sm text-red-700">驳回原因：{item.reviewNote}</p>
                    ) : null}
                  </div>

                  <div className="space-y-3 rounded-2xl border bg-slate-50 p-3">
                    {step === 3 ? (
                      <>
                        <div className="flex items-center justify-between">
                          <p className="font-semibold text-slate-950">质量评分</p>
                          <Badge variant={currentScore >= 60 ? "success" : "warning"}>
                            {currentScore} 分 · {currentScore >= 80 ? "2-3次机会" : currentScore >= 60 ? "1次机会" : "不通过"}
                          </Badge>
                        </div>
                        {[
                          ["clarity", "清晰度"],
                          ["relevance", "相关性"],
                          ["completeness", "完整度"],
                          ["authenticity", "真实感"],
                          ["expression", "表达质量"],
                        ].map(([key, label]) => (
                          <div key={key} className="grid grid-cols-[80px_1fr] items-center gap-2">
                            <Label className="text-xs">{label}</Label>
                            <Input type="number" min={0} max={20} value={score[key as keyof ScoreState] as number} onChange={(event) => updateScore(item.id, key as keyof ScoreState, event.target.value)} />
                          </div>
                        ))}
                        <textarea className="min-h-20 w-full rounded-md border bg-white px-3 py-2 text-sm" placeholder="审核说明或驳回原因" value={score.reviewNote} onChange={(event) => updateScore(item.id, "reviewNote", event.target.value)} />
                        <Button className="w-full" disabled={reviewMutation.isPending} onClick={() => approveStep3(item)}>
                          <Star className="size-4" />
                          保存质量审核
                        </Button>
                      </>
                    ) : (
                      <>
                        <textarea
                          className="min-h-20 w-full rounded-md border bg-white px-3 py-2 text-sm"
                          placeholder="驳回原因，如：链接无法打开、截图不清晰"
                          value={reviewNotes[item.id] ?? item.reviewNote ?? ""}
                          onChange={(event) => setReviewNotes((current) => ({ ...current, [item.id]: event.target.value }))}
                        />
                        <Button className="w-full" disabled={reviewMutation.isPending} onClick={() => approveStep2(item)}>
                          <CheckCircle2 className="size-4" />
                          标记确认
                        </Button>
                        <Button variant="destructive" className="w-full" disabled={reviewMutation.isPending} onClick={() => rejectStep2(item)}>
                          <XCircle className="size-4" />
                          驳回
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
