"use client";

import { useMutation } from "@tanstack/react-query";
import { Camera, CheckCircle2, Search, TicketCheck, XCircle } from "lucide-react";
import { useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";

type RedemptionPreview = {
  id: string;
  code: string;
  visualCodeCells: boolean[];
  status: string;
  redeemedAt: string | null;
  reward: {
    name: string;
    description: string | null;
    validUntil: string | null;
  };
  store: {
    name: string;
    address: string | null;
  };
  participation: {
    openid: string;
  };
};

type BarcodeDetectorShape = new (options?: { formats?: string[] }) => {
  detect(image: ImageBitmapSource): Promise<Array<{ rawValue: string }>>;
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
  if (!response.ok || !body?.success) throw new Error(body?.error ?? "请求失败");
  return body.data as T;
}

function normalizeCode(value: string) {
  return value.replace(/\D/g, "").slice(0, 6);
}

export default function MerchantMobileRedeemPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [code, setCode] = useState("");
  const [preview, setPreview] = useState<RedemptionPreview | null>(null);
  const [lastError, setLastError] = useState("");

  const lookupMutation = useMutation({
    mutationFn: async (nextCode: string) => apiRequest<{ redemption: RedemptionPreview }>(`/api/merchant/mobile/redeem?code=${encodeURIComponent(nextCode)}`),
    onSuccess: (data) => {
      setPreview(data.redemption);
      setLastError("");
    },
    onError: (error) => {
      setPreview(null);
      const message = error instanceof Error ? error.message : "核销码无效";
      setLastError(message);
      toast({ title: "查询失败", description: message });
    },
  });

  const redeemMutation = useMutation({
    mutationFn: async () => {
      if (!preview) throw new Error("请先查询核销码");
      return apiRequest<{ redemption: RedemptionPreview }>(`/api/redemptions/${preview.id}/redeem`, {
        method: "POST",
        body: JSON.stringify({ code }),
      });
    },
    onSuccess: (data) => {
      setPreview(data.redemption);
      setLastError("");
      toast({ title: "核销成功", description: `${data.redemption.reward.name} 已完成核销。` });
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "核销失败";
      setLastError(message);
      toast({ title: "核销失败", description: message });
    },
  });

  const lookup = () => {
    if (code.length !== 6) {
      toast({ title: "请输入 6 位数字核销码" });
      return;
    }
    lookupMutation.mutate(code);
  };

  const handleScanImage = async (file: File | null) => {
    if (!file) return;
    const BarcodeDetector = (window as unknown as { BarcodeDetector?: BarcodeDetectorShape }).BarcodeDetector;
    if (!BarcodeDetector) {
      toast({ title: "当前浏览器不支持扫码", description: "请手动输入 6 位核销码。" });
      return;
    }

    const bitmap = await createImageBitmap(file);
    const detector = new BarcodeDetector({ formats: ["qr_code"] });
    const result = await detector.detect(bitmap);
    const raw = result[0]?.rawValue ?? "";
    const detected = normalizeCode(raw);
    if (detected.length === 6) {
      setCode(detected);
      lookupMutation.mutate(detected);
    } else {
      toast({ title: "未识别到 6 位核销码", description: "请对准核销码区域后重试。" });
    }
  };

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <section className="rounded-[28px] bg-slate-950 p-5 text-white shadow-[0_24px_60px_-42px_rgba(15,23,42,0.75)]">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-200">Mobile Redeem</p>
            <h1 className="mt-1 text-2xl font-black">员工核销</h1>
          </div>
          <TicketCheck className="size-7 text-orange-200" />
        </div>
        <p className="mt-3 text-sm leading-6 text-slate-300">扫码或输入 6 位核销码，10 秒内完成奖励确认。</p>
      </section>

      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <Input
              value={code}
              onChange={(event) => setCode(normalizeCode(event.target.value))}
              placeholder="输入 6 位核销码"
              inputMode="numeric"
              className="h-12 text-center font-mono text-2xl font-black tracking-[0.2em]"
            />
            <Button className="h-12" disabled={lookupMutation.isPending} onClick={lookup}>
              <Search className="size-4" />
              查询
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" className="h-11" onClick={() => fileInputRef.current?.click()}>
              <Camera className="size-4" />
              扫码核销
            </Button>
            <Button className="h-11" disabled={!preview || redeemMutation.isPending || preview.status === "USED"} onClick={() => redeemMutation.mutate()}>
              <CheckCircle2 className="size-4" />
              确认核销
            </Button>
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(event) => handleScanImage(event.target.files?.[0] ?? null)} />
        </CardContent>
      </Card>

      {lastError ? (
        <Card className="border-red-100 bg-red-50">
          <CardContent className="flex items-center gap-3 p-4 text-sm text-red-700">
            <XCircle className="size-5" />
            {lastError}
          </CardContent>
        </Card>
      ) : null}

      {preview ? (
        <Card className="overflow-hidden">
          <CardContent className="space-y-4 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-lg font-semibold text-slate-950">{preview.reward.name}</p>
                <p className="mt-1 text-sm text-slate-500">{preview.reward.description ?? "到店奖励"}</p>
              </div>
              <Badge variant={preview.status === "USED" ? "muted" : "success"}>
                {preview.status === "USED" ? "已核销" : "可核销"}
              </Badge>
            </div>
            <div className="rounded-2xl border bg-slate-50 p-4 text-sm leading-6 text-slate-600">
              <p>门店：{preview.store.name}</p>
              <p>用户：{preview.participation.openid}</p>
              <p>有效期：{preview.reward.validUntil ? new Date(preview.reward.validUntil).toLocaleString("zh-CN") : "以门店说明为准"}</p>
            </div>
            <div className="rounded-2xl bg-orange-50 p-4 text-center">
              <p className="font-mono text-4xl font-black tracking-[0.2em] text-slate-950">{preview.code}</p>
              <p className="mt-2 text-xs text-slate-500">请与用户页面核销码一致后确认</p>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
