"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Camera,
  CheckCircle2,
  ChevronDown,
  Clock3,
  ExternalLink,
  ImagePlus,
  LinkIcon,
  UploadCloud,
} from "lucide-react";

import { LinkTutorialContent } from "@/components/h5/link-tutorial";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";
import { createH5Submission, fetchH5Tasks, getOrCreateParticipation } from "@/lib/h5/api";
import type { Submission, SubmitTaskType } from "@/lib/h5/types";
import { taskTypeToTaskId, useH5CampaignStore } from "@/store/h5-campaign-store";

type SubmitMode = "link" | "screenshot";

const taskLabels: Record<SubmitTaskType, { title: string; reward: string; hint: string }> = {
  "l2-photo": {
    title: "L2 拍照打卡",
    reward: "招牌荤菜兑换券",
    hint: "上传门店特色打卡点截图或照片。",
  },
  "l2-review": {
    title: "L2 大众点评打卡",
    reward: "招牌荤菜兑换券",
    hint: "优先粘贴大众点评评价链接，也可上传截图。",
  },
  "l3-douyin": {
    title: "L3 发布内容",
    reward: "甜品 + 霸王餐抽奖资格",
    hint: "粘贴抖音/小红书/朋友圈等发布链接。",
  },
  "l3-xiaohongshu": {
    title: "L3 发布内容",
    reward: "甜品 + 霸王餐抽奖资格",
    hint: "粘贴抖音/小红书/朋友圈等发布链接。",
  },
};

function normalizeTaskId(value: string | null): SubmitTaskType {
  if (value === "l3-post") return "l3-douyin";
  if (value === "l2-review" || value === "l2-photo" || value === "l3-douyin" || value === "l3-xiaohongshu") {
    return value;
  }
  return "l2-review";
}

export default function SubmitPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const campaignId = params.campaignId as string;
  const initialType = normalizeTaskId(searchParams.get("taskId"));
  const [taskType] = useState<SubmitTaskType>(initialType);
  const [mode, setMode] = useState<SubmitMode>("link");
  const [imageUrl, setImageUrl] = useState("");
  const [link, setLink] = useState("");
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const submissions = useH5CampaignStore((state) => state.submissions);
  const addSubmission = useH5CampaignStore((state) => state.addSubmission);
  const approveSubmission = useH5CampaignStore((state) => state.approveSubmission);

  const { data: tasks = [] } = useQuery({
    queryKey: ["h5-tasks", campaignId],
    queryFn: () => fetchH5Tasks(campaignId),
  });

  const selected = useMemo(() => taskLabels[taskType], [taskType]);
  const taskSubmissions = submissions.filter((submission) => submission.taskType === taskType);
  const latestSubmission = taskSubmissions[0];
  const canSubmit = mode === "link" ? Boolean(link.trim()) : Boolean(imageUrl);

  const handleFile = (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    setImageUrl(URL.createObjectURL(file));
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setIsSubmitting(true);
    try {
      const localTaskId = taskTypeToTaskId(taskType);
      const apiTaskId = tasks.find((task) => task.id === localTaskId)?.apiTaskId ?? localTaskId;
      const { participationId } = await getOrCreateParticipation(campaignId);
      const result = await createH5Submission({
        participationId,
        taskId: apiTaskId,
        content: note.trim() || undefined,
        imageUrls: mode === "screenshot" && imageUrl ? [imageUrl] : [],
        platformLink: mode === "link" ? link.trim() : undefined,
      });
      const submission: Submission = {
        id: result.submission.id,
        taskType,
        taskId: localTaskId,
        proofType: mode === "link" ? "LINK" : "SCREENSHOT",
        imageUrl: mode === "screenshot" ? imageUrl : undefined,
        link: mode === "link" ? link.trim() : undefined,
        note: note.trim() || undefined,
        status: "PENDING_REVIEW",
        submittedAt: result.submission.submittedAt,
      };
      addSubmission(submission);
      toast({
        title: mode === "link" ? "链接已提交，门店审核中" : "截图已提交，门店审核中",
        description: "审核通过后会自动点亮任务并解锁奖励。",
      });
    } catch (error) {
      toast({
        title: "提交失败",
        description: error instanceof Error ? error.message : "请稍后重试",
        className: "border-red-200 bg-red-50 text-red-900",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApprove = (submissionId: string) => {
    approveSubmission(submissionId);
    toast({ title: "审核已通过", description: "对应关卡已完成，后续奖励已解锁。" });
  };

  return (
    <div className="space-y-4">
      <section className="relative overflow-hidden rounded-2xl border border-orange-100 bg-white/95 p-4 shadow-[0_18px_42px_-34px_rgba(255,90,44,0.65)]">
        <div className="pointer-events-none absolute -right-10 -top-10 size-28 rounded-full bg-orange-100" aria-hidden="true" />
        <div className="relative">
          <Badge className="bg-orange-100 text-brand-orange">优先粘贴链接</Badge>
          <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-950">提交任务凭证</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">{selected.hint}</p>
        </div>
      </section>

      <Card className="border-orange-100/80 bg-white/95">
        <CardContent className="space-y-4 p-4">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setMode("link")}
              className={`rounded-2xl border p-4 text-left transition-all active:scale-[0.99] ${
                mode === "link"
                  ? "border-brand-orange bg-orange-50 text-brand-orange-deep shadow-[0_18px_32px_-28px_rgba(255,90,44,0.8)]"
                  : "border-slate-200 bg-white text-slate-600"
              }`}
            >
              <LinkIcon className="h-5 w-5" />
              <p className="mt-3 text-base font-black">粘贴链接</p>
              <p className="mt-1 text-xs leading-5">推荐，审核更快</p>
            </button>
            <button
              type="button"
              onClick={() => setMode("screenshot")}
              className={`rounded-2xl border p-4 text-left transition-all active:scale-[0.99] ${
                mode === "screenshot"
                  ? "border-brand-orange bg-orange-50 text-brand-orange-deep shadow-[0_18px_32px_-28px_rgba(255,90,44,0.8)]"
                  : "border-slate-200 bg-white text-slate-600"
              }`}
            >
              <ImagePlus className="h-5 w-5" />
              <p className="mt-3 text-base font-black">上传截图</p>
              <p className="mt-1 text-xs leading-5">找不到链接时使用</p>
            </button>
          </div>

          <div className="rounded-2xl border border-orange-100 bg-orange-50/70 p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-950">{selected.title}</p>
                <p className="mt-1 text-xs text-slate-500">奖励：{selected.reward}</p>
              </div>
              <Badge variant="secondary">{mode === "link" ? "链接审核" : "截图审核"}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200/80 bg-white/95">
        <CardContent className="space-y-4 p-4">
          {mode === "link" ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <ExternalLink className="h-4 w-4 text-brand-orange" />
                <label className="text-sm font-semibold text-slate-900">发布链接</label>
              </div>
              <Input
                inputMode="url"
                placeholder="粘贴抖音/小红书/大众点评链接"
                value={link}
                onChange={(event) => setLink(event.target.value)}
                className="h-12 rounded-xl"
              />
              <button
                type="button"
                onClick={() => setTutorialOpen(true)}
                className="inline-flex items-center gap-1 text-sm font-medium text-brand-orange"
              >
                不知道怎么找链接？查看教程
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Camera className="h-4 w-4 text-brand-orange" />
                <label className="text-sm font-semibold text-slate-900">截图或照片</label>
              </div>
              <label className="group flex min-h-48 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-orange-200 bg-gradient-to-br from-orange-50 to-white px-4 py-6 text-center transition hover:border-brand-orange hover:shadow-[0_18px_36px_-30px_rgba(255,90,44,0.85)]">
                {imageUrl ? (
                  <div
                    aria-label="凭证预览"
                    className="h-40 w-full rounded-2xl border border-orange-100 bg-cover bg-center shadow-sm"
                    style={{ backgroundImage: `url(${imageUrl})` }}
                  />
                ) : (
                  <>
                    <UploadCloud className="h-9 w-9 text-brand-orange transition-transform group-hover:-translate-y-0.5" />
                    <span className="mt-3 text-sm font-semibold text-slate-800">拍照或从相册选择</span>
                    <span className="mt-1 text-xs text-slate-500">支持 JPG/PNG，本地预览后提交</span>
                  </>
                )}
                <Input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(event) => handleFile(event.target.files)}
                />
              </label>
            </div>
          )}

          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="补充说明（选填）"
            className="min-h-20 w-full rounded-xl border border-input bg-white px-3 py-2 text-sm shadow-sm outline-none transition focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/35"
          />
        </CardContent>
      </Card>

      <Button className="h-12 w-full text-base" disabled={!canSubmit || isSubmitting} onClick={handleSubmit}>
        {isSubmitting ? "提交中..." : mode === "link" ? "提交链接" : "提交截图"}
      </Button>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-950">审核状态</h3>
        {taskSubmissions.length ? (
          taskSubmissions.map((submission) => (
            <Card key={submission.id} className="border-slate-200/80 bg-white/95">
              <CardContent className="space-y-3 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-950">{submission.proofType === "LINK" ? "链接已提交，门店审核中" : "截图已提交，门店审核中"}</p>
                    <p className="text-xs text-slate-500">
                      {new Date(submission.submittedAt).toLocaleString("zh-CN")}
                    </p>
                  </div>
                  <Badge variant={submission.status === "APPROVED" ? "success" : "warning"}>
                    {submission.status === "APPROVED" ? (
                      <CheckCircle2 className="mr-1 h-4 w-4" />
                    ) : (
                      <Clock3 className="mr-1 h-4 w-4" />
                    )}
                    {submission.status === "APPROVED" ? "已通过" : "待审核"}
                  </Badge>
                </div>
                {submission.status === "PENDING_REVIEW" ? (
                  <Button variant="outline" className="h-10 w-full" onClick={() => handleApprove(submission.id)}>
                    模拟审核通过
                  </Button>
                ) : (
                  <div className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">
                    审核通过，奖励已解锁。请前往奖励页领取兑换码。
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white/70 p-5 text-center text-sm text-slate-500">
            提交后会在这里显示审核进度。
          </div>
        )}
      </section>

      {latestSubmission?.status === "APPROVED" ? (
        <Button variant="secondary" className="h-11 w-full" asChild>
          <Link href={`/h5/campaign/${campaignId}/rewards`}>查看已解锁奖励</Link>
        </Button>
      ) : null}

      <Dialog open={tutorialOpen} onOpenChange={setTutorialOpen}>
        <DialogContent className="bottom-0 top-auto max-h-[82vh] translate-y-0 overflow-y-auto rounded-b-none sm:bottom-auto sm:top-1/2 sm:translate-y-[-50%] sm:rounded-2xl">
          <DialogHeader>
            <DialogTitle>复制链接教程</DialogTitle>
          </DialogHeader>
          <LinkTutorialContent compact />
        </DialogContent>
      </Dialog>
    </div>
  );
}
