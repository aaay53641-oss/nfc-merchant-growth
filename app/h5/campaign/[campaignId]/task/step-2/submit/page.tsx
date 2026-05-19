"use client";

import { useParams, useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Camera, CheckCircle2, LinkIcon, UserCheck } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";
import {
  getOrCreateParticipation,
  submitStaffConfirm,
  submitVerificationLink,
  submitVerificationScreenshot,
} from "@/lib/h5/api";
import { fileToDataUrl, readStepDraft, type StepDraft } from "@/lib/h5/three-step";
import { useH5CampaignStore } from "@/store/h5-campaign-store";

type Mode = "staff" | "link" | "screenshot";

export default function Step2SubmitPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const campaignId = params.campaignId as string;
  const setTaskStatus = useH5CampaignStore((state) => state.setTaskStatus);
  const [draft, setDraft] = useState<StepDraft | null>(null);
  const [mode, setMode] = useState<Mode>("staff");
  const [link, setLink] = useState("");
  const [screenshot, setScreenshot] = useState("");

  useEffect(() => {
    setDraft(readStepDraft(campaignId, 2));
  }, [campaignId]);

  const submitMutation = useMutation({
    mutationFn: async () => {
      const participation = await getOrCreateParticipation(campaignId);
      if (mode === "staff") {
        return submitStaffConfirm({
          participationId: participation.participationId,
          taskSortOrder: 2,
          platform: draft?.platform,
          note: "店员现场确认第二关完成",
        });
      }
      if (mode === "link") {
        return submitVerificationLink({
          participationId: participation.participationId,
          taskSortOrder: 2,
          platform: draft?.platform,
          link,
          content: draft?.content,
        });
      }
      return submitVerificationScreenshot({
        participationId: participation.participationId,
        taskSortOrder: 2,
        platform: draft?.platform,
        screenshotUrl: screenshot,
        content: draft?.content,
      });
    },
    onSuccess: () => {
      setTaskStatus("l2", mode === "staff" ? "APPROVED" : "SUBMITTED");
      queryClient.invalidateQueries({ queryKey: ["h5-rewards"] });
      toast({
        title: mode === "staff" ? "店员已确认" : "链接已提交，门店审核中",
        description: mode === "staff" ? "第二关奖励已解锁。" : "审核通过后可在我的奖励查看。",
      });
      router.push(mode === "staff" ? `/h5/campaign/${campaignId}/task/step-3` : `/h5/campaign/${campaignId}/rewards`);
    },
    onError: (error) => {
      toast({ title: "提交失败", description: error instanceof Error ? error.message : "请稍后重试" });
    },
  });

  const handleScreenshot = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    setScreenshot(await fileToDataUrl(file));
  };

  const disabled =
    submitMutation.isPending ||
    (mode === "link" && !link.trim()) ||
    (mode === "screenshot" && !screenshot);

  return (
    <div className="-mx-4 -my-4 min-h-screen bg-[#F5F0EB] px-4 pb-8 pt-4">
      <section className="rounded-[28px] bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-orange">Confirm</p>
        <h1 className="mt-1 text-2xl font-black text-slate-950">第二关完成确认</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">推荐店员现场确认审核更快，也可以粘贴评价链接或上传发布截图。</p>
      </section>

      <section className="mt-4 grid gap-3">
        {[
          { value: "staff" as const, title: "店员现场确认", desc: "最快通过，适合到店当场确认", icon: UserCheck },
          { value: "link" as const, title: "粘贴评价链接", desc: "复制平台评价链接后提交", icon: LinkIcon },
          { value: "screenshot" as const, title: "上传发布截图", desc: "截图兜底，门店审核后通过", icon: Camera },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.value}
              type="button"
              onClick={() => setMode(item.value)}
              className={`rounded-2xl border p-4 text-left transition ${
                mode === item.value ? "border-brand-orange bg-orange-50" : "border-slate-100 bg-white"
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className="size-5 text-brand-orange" />
                <div>
                  <p className="font-semibold text-slate-950">{item.title}</p>
                  <p className="mt-1 text-xs text-slate-500">{item.desc}</p>
                </div>
              </div>
            </button>
          );
        })}
      </section>

      <Card className="mt-4 border-orange-100 bg-white">
        <CardContent className="space-y-4 p-4">
          {mode === "staff" ? (
            <div className="rounded-2xl bg-emerald-50 p-4 text-sm leading-6 text-emerald-700">
              请将页面交给店员确认。确认后第二关奖励会立即解锁。
            </div>
          ) : null}
          {mode === "link" ? (
            <Input value={link} onChange={(event) => setLink(event.target.value)} placeholder="粘贴美团/大众点评/抖音/百度评价链接" />
          ) : null}
          {mode === "screenshot" ? (
            <label className="flex min-h-44 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-orange-200 bg-orange-50 text-center text-sm text-brand-orange">
              {screenshot ? (
                <span className="flex items-center gap-2 text-emerald-700"><CheckCircle2 className="size-5" />截图已选择</span>
              ) : (
                <>
                  <Camera className="mb-2 size-8" />
                  支持拍照或相册选择
                </>
              )}
              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(event) => handleScreenshot(event.target.files)} />
            </label>
          ) : null}
          <Button className="h-12 w-full rounded-2xl" disabled={disabled} onClick={() => submitMutation.mutate()}>
            {submitMutation.isPending ? "提交中..." : "提交确认"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
