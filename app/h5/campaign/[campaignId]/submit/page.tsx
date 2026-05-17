"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { CheckCircle2, Clock3, LinkIcon, UploadCloud } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";
import { createH5Submission, getOrCreateParticipation } from "@/lib/h5/api";
import type { Submission, SubmitTaskType } from "@/lib/h5/types";
import { taskTypeToTaskId, useH5CampaignStore } from "@/store/h5-campaign-store";

const submitOptions: Array<{
  value: SubmitTaskType;
  label: string;
  reward: string;
  guide: string;
  proofType: "SCREENSHOT" | "LINK";
}> = [
  {
    value: "l2-photo",
    label: "L2 拍照打卡",
    reward: "招牌荤菜兑换券",
    guide: "上传门店特色打卡点照片，需能看出门店环境。",
    proofType: "SCREENSHOT",
  },
  {
    value: "l2-review",
    label: "L2 大众点评打卡",
    reward: "招牌荤菜兑换券",
    guide: "上传大众点评打卡截图或粘贴点评链接。",
    proofType: "SCREENSHOT",
  },
  {
    value: "l3-douyin",
    label: "L3 抖音发布",
    reward: "甜品 + 霸王餐抽奖资格",
    guide: "粘贴抖音发布链接，也可补充截图。",
    proofType: "LINK",
  },
  {
    value: "l3-xiaohongshu",
    label: "L3 小红书发布",
    reward: "甜品 + 霸王餐抽奖资格",
    guide: "粘贴小红书笔记链接，也可补充截图。",
    proofType: "LINK",
  },
];

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
  const [taskType, setTaskType] = useState<SubmitTaskType>(initialType);
  const [imageUrl, setImageUrl] = useState("");
  const [link, setLink] = useState("");
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submissions = useH5CampaignStore((state) => state.submissions);
  const addSubmission = useH5CampaignStore((state) => state.addSubmission);
  const approveSubmission = useH5CampaignStore((state) => state.approveSubmission);

  const selected = useMemo(
    () => submitOptions.find((option) => option.value === taskType) ?? submitOptions[0],
    [taskType]
  );
  const taskSubmissions = submissions.filter((submission) => submission.taskType === taskType);
  const latestSubmission = taskSubmissions[0];
  const canSubmit = Boolean(imageUrl || link.trim());

  const handleFile = (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    setImageUrl(URL.createObjectURL(file));
  };

  const handleSubmit = () => {
    if (!canSubmit) return;
    setIsSubmitting(true);
    window.setTimeout(() => {
      const submission: Submission = {
        id: `sub-${Date.now()}`,
        taskType,
        taskId: taskTypeToTaskId(taskType),
        proofType: link.trim() ? "LINK" : "SCREENSHOT",
        imageUrl,
        link: link.trim() || undefined,
        note: note.trim() || undefined,
        status: "PENDING_REVIEW",
        submittedAt: new Date().toISOString(),
      };
      addSubmission(submission);
      setIsSubmitting(false);
      toast({ title: "凭证已提交", description: "当前状态为待审核，可在本页模拟审核通过。" });
    }, 500);
  };

  const handleApprove = (submissionId: string) => {
    approveSubmission(submissionId);
    toast({ title: "审核已通过", description: "对应关卡已完成，后续奖励已解锁。" });
  };

  return (
    <div className="space-y-4">
      <section className="rounded-lg border bg-white p-4">
        <h2 className="text-xl font-bold text-slate-950">上传凭证</h2>
        <p className="mt-1 text-sm text-slate-500">提交截图或发布链接，门店审核通过后自动解锁奖励。</p>
      </section>

      <Card>
        <CardContent className="space-y-4 p-4">
          <div>
            <label className="text-sm font-medium text-slate-900">任务类型</label>
            <select
              value={taskType}
              onChange={(event) => setTaskType(event.target.value as SubmitTaskType)}
              className="mt-2 h-11 w-full rounded-lg border border-input bg-white px-3 text-sm shadow-sm outline-none transition focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/35"
            >
              {submitOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="rounded-2xl border border-orange-100 bg-orange-50/70 p-3">
            <p className="text-sm font-medium text-slate-950">奖励：{selected.reward}</p>
            <p className="mt-1 text-sm leading-6 text-slate-600">{selected.guide}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="flex items-center gap-2">
            <UploadCloud className="h-5 w-5 text-slate-500" />
            <h3 className="font-semibold text-slate-950">截图上传</h3>
          </div>

          <label className="group flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-orange-200 bg-gradient-to-br from-orange-50 to-white px-4 py-6 text-center transition hover:border-brand-orange hover:shadow-[0_18px_36px_-30px_rgba(255,90,44,0.85)]">
            {imageUrl ? (
              <div
                aria-label="凭证预览"
                className="h-32 w-full rounded-2xl border border-orange-100 bg-cover bg-center shadow-sm"
                style={{ backgroundImage: `url(${imageUrl})` }}
              />
            ) : (
              <>
                <UploadCloud className="h-8 w-8 text-brand-orange transition-transform group-hover:-translate-y-0.5" />
                <span className="mt-2 text-sm font-medium text-slate-700">上传截图</span>
                <span className="mt-1 text-xs text-slate-500">JPG/PNG，Mock 仅本地预览</span>
              </>
            )}
            <Input type="file" accept="image/*" className="hidden" onChange={(event) => handleFile(event.target.files)} />
          </label>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <LinkIcon className="h-4 w-4 text-slate-500" />
              <label className="text-sm font-medium text-slate-900">发布链接</label>
            </div>
            <Input placeholder="粘贴大众点评 / 抖音 / 小红书链接" value={link} onChange={(event) => setLink(event.target.value)} />
          </div>

          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="补充说明（选填）"
            className="min-h-24 w-full rounded-lg border border-input bg-white px-3 py-2 text-sm shadow-sm outline-none transition focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/35"
          />
        </CardContent>
      </Card>

      <Button className="h-12 w-full" disabled={!canSubmit || isSubmitting} onClick={handleSubmit}>
        {isSubmitting ? "提交中..." : "确认提交"}
      </Button>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-950">审核状态</h3>
        {taskSubmissions.length ? (
          taskSubmissions.map((submission) => (
            <Card key={submission.id}>
              <CardContent className="space-y-3 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-950">{selected.label}</p>
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
                  <div className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-700">
                    审核通过，奖励已解锁。请前往奖励页领取兑换码。
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="rounded-lg border border-dashed p-4 text-center text-sm text-slate-500">
            暂无提交记录。
          </div>
        )}
      </section>

      {latestSubmission?.status === "APPROVED" ? (
        <Button variant="secondary" className="h-11 w-full" asChild>
          <Link href={`/h5/campaign/${campaignId}/rewards`}>查看已解锁奖励</Link>
        </Button>
      ) : null}
    </div>
  );
}
