"use client";

import { useParams, useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { Camera, Link2, Send } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";
import { getOrCreateParticipation, submitVerificationLink, submitVerificationScreenshot } from "@/lib/h5/api";
import { fileToDataUrl, readStepDraft } from "@/lib/h5/three-step";
import { useH5CampaignStore } from "@/store/h5-campaign-store";

type SubmitMode = "link" | "screenshot";

export default function Step3SubmitPage() {
  const params = useParams();
  const router = useRouter();
  const campaignId = params.campaignId as string;
  const setTaskStatus = useH5CampaignStore((state) => state.setTaskStatus);
  const [mode, setMode] = useState<SubmitMode>("link");
  const [link, setLink] = useState("");
  const [screenshot, setScreenshot] = useState("");

  const draft = useMemo(() => readStepDraft(campaignId, 3), [campaignId]);

  const submitMutation = useMutation({
    mutationFn: async () => {
      const participation = await getOrCreateParticipation(campaignId);
      const platform = draft?.platform;
      const content = draft ? `${draft.title}\n${draft.content}` : undefined;

      if (mode === "link") {
        if (!link.trim()) throw new Error("请粘贴发布链接");
        return submitVerificationLink({
          participationId: participation.participationId,
          taskSortOrder: 3,
          platform,
          link: link.trim(),
          content,
        });
      }

      if (!screenshot) throw new Error("请上传发布截图");
      return submitVerificationScreenshot({
        participationId: participation.participationId,
        taskSortOrder: 3,
        platform,
        screenshotUrl: screenshot,
        content,
      });
    },
    onSuccess: () => {
      setTaskStatus("l3", "SUBMITTED");
      toast({ title: "已提交第三关", description: "门店审核通过后会进入霸王餐抽奖池。" });
      router.push(`/h5/campaign/${campaignId}/lottery`);
    },
    onError: (error) => {
      toast({
        title: "提交失败",
        description: error instanceof Error ? error.message : "请稍后重试",
        className: "border-red-200 bg-red-50 text-red-900",
      });
    },
  });

  const handleScreenshot = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    setScreenshot(await fileToDataUrl(file));
  };

  return (
    <div className="-mx-4 -my-4 min-h-screen bg-[#F5F0EB] px-4 pb-8 pt-4">
      <section className="rounded-[28px] bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-orange">Submit</p>
        <h1 className="mt-1 text-2xl font-black text-slate-950">提交第三关内容</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          粘贴发布链接优先；链接暂时不可用时，上传截图作为兜底凭证。
        </p>
      </section>

      {draft ? (
        <Card className="mt-4 border-orange-100 bg-white">
          <CardContent className="space-y-2 p-4">
            <p className="text-xs font-semibold text-slate-400">待确认内容</p>
            <p className="font-semibold text-slate-950">{draft.platformName} · {draft.title}</p>
            <p className="line-clamp-3 text-sm leading-6 text-slate-600">{draft.content}</p>
          </CardContent>
        </Card>
      ) : null}

      <Card className="mt-4 border-orange-100 bg-white">
        <CardContent className="space-y-4 p-4">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setMode("link")}
              className={`rounded-2xl border p-4 text-left ${mode === "link" ? "border-brand-orange bg-orange-50" : "border-slate-100 bg-white"}`}
            >
              <Link2 className="mb-3 size-5 text-brand-orange" />
              <p className="font-semibold text-slate-950">粘贴链接</p>
              <p className="mt-1 text-xs text-slate-500">审核更准确</p>
            </button>
            <button
              type="button"
              onClick={() => setMode("screenshot")}
              className={`rounded-2xl border p-4 text-left ${mode === "screenshot" ? "border-brand-orange bg-orange-50" : "border-slate-100 bg-white"}`}
            >
              <Camera className="mb-3 size-5 text-brand-orange" />
              <p className="font-semibold text-slate-950">上传截图</p>
              <p className="mt-1 text-xs text-slate-500">发布后截图</p>
            </button>
          </div>

          {mode === "link" ? (
            <Input
              value={link}
              onChange={(event) => setLink(event.target.value)}
              placeholder="粘贴内容发布链接"
              inputMode="url"
            />
          ) : (
            <label className="flex min-h-44 cursor-pointer flex-col items-center justify-center rounded-3xl border border-dashed border-orange-200 bg-orange-50 text-center text-sm text-brand-orange">
              {screenshot ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={screenshot} alt="发布截图预览" className="max-h-52 rounded-2xl object-cover" />
              ) : (
                <>
                  <Camera className="mb-2 size-6" />
                  上传发布截图
                </>
              )}
              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(event) => handleScreenshot(event.target.files)} />
            </label>
          )}

          <Button className="h-12 w-full rounded-2xl" disabled={submitMutation.isPending} onClick={() => submitMutation.mutate()}>
            <Send className="size-4" />
            {submitMutation.isPending ? "提交中..." : "提交审核，查看抽奖资格"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
