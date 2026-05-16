"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FormEvent, useMemo, useState } from "react";
import { Handshake, Percent, Ticket, TicketCheck, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";

type MerchantOption = { id: string; name: string; status: string };
type Partner = {
  id: string;
  name: string;
  type: string | null;
  contactName: string | null;
  contactPhone: string | null;
  status: "ACTIVE" | "INACTIVE";
  merchantId: string;
  merchantName: string;
  couponsCount: number;
};
type Coupon = {
  id: string;
  name: string;
  description: string | null;
  discount: number;
  validFrom: string;
  validUntil: string;
  partnerId: string;
  partnerName: string;
  merchantName: string;
  claimsCount: number;
};
type AllianceResponse = {
  merchants: MerchantOption[];
  partners: Partner[];
  coupons: Coupon[];
};
type AllianceStats = {
  totalPartners: number;
  totalCouponsIssued: number;
  totalCouponsRedeemed: number;
  redemptionRate: number;
  topPartners: Array<{ name: string; couponsIssued: number; redemptionRate: number }>;
  dailyTrend: Array<{ date: string; issued: number; redeemed: number }>;
};

async function fetchAlliance(): Promise<AllianceResponse> {
  const response = await fetch("/api/platform/alliance");
  if (!response.ok) throw new Error("Failed to load alliance data");
  return response.json();
}

async function fetchAllianceStats(): Promise<AllianceStats> {
  const response = await fetch("/api/platform/stats/alliance");
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error ?? "Failed to load alliance stats");
  }
  return response.json();
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function formatNumber(value: number | undefined) {
  return (value ?? 0).toLocaleString();
}

function formatPercent(value: number | undefined) {
  return `${((value ?? 0) * 100).toFixed(1)}%`;
}

export default function PlatformAlliancePage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["platform-alliance"],
    queryFn: fetchAlliance,
  });
  const {
    data: stats,
    error: statsError,
    isLoading: statsLoading,
  } = useQuery({
    queryKey: ["platform-alliance-stats"],
    queryFn: fetchAllianceStats,
  });
  const firstMerchantId = data?.merchants[0]?.id ?? "";
  const firstPartnerId = data?.partners[0]?.id ?? "";
  const [partnerForm, setPartnerForm] = useState({
    merchantId: "",
    name: "",
    type: "",
    contactName: "",
    contactPhone: "",
  });
  const [couponForm, setCouponForm] = useState({
    partnerId: "",
    name: "",
    description: "",
    discount: "10",
    validFrom: today(),
    validUntil: today(),
  });

  const partnerMerchantId = partnerForm.merchantId || firstMerchantId;
  const couponPartnerId = couponForm.partnerId || firstPartnerId;

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["platform-alliance"] });
  };

  const partnerMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/platform/alliance/partners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...partnerForm, merchantId: partnerMerchantId }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? "新增联盟商户失败");
      }
      return response.json();
    },
    onSuccess: async () => {
      await refresh();
      setPartnerForm({ merchantId: "", name: "", type: "", contactName: "", contactPhone: "" });
      toast({ title: "联盟商户已新增" });
    },
    onError: (error) => toast({ title: "新增失败", description: error.message }),
  });

  const couponMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/platform/alliance/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...couponForm, partnerId: couponPartnerId }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? "新增优惠券失败");
      }
      return response.json();
    },
    onSuccess: async () => {
      await refresh();
      setCouponForm({
        partnerId: "",
        name: "",
        description: "",
        discount: "10",
        validFrom: today(),
        validUntil: today(),
      });
      toast({ title: "联盟优惠券已新增" });
    },
    onError: (error) => toast({ title: "新增失败", description: error.message }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (input: { type: "partner" | "coupon"; id: string }) => {
      const path =
        input.type === "partner"
          ? `/api/platform/alliance/partners/${input.id}`
          : `/api/platform/alliance/coupons/${input.id}`;
      const response = await fetch(path, { method: "DELETE" });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? "删除失败");
      }
      return response.json();
    },
    onSuccess: refresh,
    onError: (error) => toast({ title: "删除失败", description: error.message }),
  });

  const partnerOptions = useMemo(() => data?.partners ?? [], [data?.partners]);

  const submitPartner = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    partnerMutation.mutate();
  };

  const submitCoupon = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    couponMutation.mutate();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-950">异业联盟</h1>
        <p className="text-sm text-slate-500">管理联盟商户和跨商户优惠券。</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "联盟商户数",
            value: formatNumber(stats?.totalPartners),
            icon: Handshake,
          },
          {
            label: "优惠券领取数",
            value: formatNumber(stats?.totalCouponsIssued),
            icon: Ticket,
          },
          {
            label: "优惠券核销数",
            value: formatNumber(stats?.totalCouponsRedeemed),
            icon: TicketCheck,
          },
          {
            label: "联盟核销率",
            value: formatPercent(stats?.redemptionRate),
            icon: Percent,
          },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.label}>
              <CardContent className="flex items-center justify-between p-5">
                <div>
                  <p className="text-sm text-slate-500">{item.label}</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-950">
                    {statsLoading ? "..." : item.value}
                  </p>
                </div>
                <div className="flex size-10 items-center justify-center rounded-md bg-slate-100">
                  <Icon className="size-5 text-slate-700" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {statsError ? (
        <Card>
          <CardContent className="p-4 text-sm text-amber-700">
            联盟统计暂不可用：{statsError.message}
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>新增联盟商户</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="grid gap-3" onSubmit={submitPartner}>
              <div className="space-y-2">
                <Label>归属商家</Label>
                <select
                  className="h-10 w-full rounded-md border bg-white px-3 text-sm"
                  value={partnerMerchantId}
                  onChange={(event) =>
                    setPartnerForm((form) => ({ ...form, merchantId: event.target.value }))
                  }
                  required
                >
                  {(data?.merchants ?? []).map((merchant) => (
                    <option key={merchant.id} value={merchant.id}>
                      {merchant.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>联盟商户名称</Label>
                  <Input
                    value={partnerForm.name}
                    onChange={(event) =>
                      setPartnerForm((form) => ({ ...form, name: event.target.value }))
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>类型</Label>
                  <Input
                    value={partnerForm.type}
                    onChange={(event) =>
                      setPartnerForm((form) => ({ ...form, type: event.target.value }))
                    }
                    placeholder="影院 / 咖啡 / 健身"
                  />
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>联系人</Label>
                  <Input
                    value={partnerForm.contactName}
                    onChange={(event) =>
                      setPartnerForm((form) => ({ ...form, contactName: event.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>联系电话</Label>
                  <Input
                    value={partnerForm.contactPhone}
                    onChange={(event) =>
                      setPartnerForm((form) => ({ ...form, contactPhone: event.target.value }))
                    }
                  />
                </div>
              </div>
              <Button type="submit" disabled={partnerMutation.isPending || !partnerMerchantId}>
                新增联盟商户
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>新增联盟优惠券</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="grid gap-3" onSubmit={submitCoupon}>
              <div className="space-y-2">
                <Label>联盟商户</Label>
                <select
                  className="h-10 w-full rounded-md border bg-white px-3 text-sm"
                  value={couponPartnerId}
                  onChange={(event) =>
                    setCouponForm((form) => ({ ...form, partnerId: event.target.value }))
                  }
                  required
                >
                  {partnerOptions.map((partner) => (
                    <option key={partner.id} value={partner.id}>
                      {partner.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>优惠券名称</Label>
                  <Input
                    value={couponForm.name}
                    onChange={(event) =>
                      setCouponForm((form) => ({ ...form, name: event.target.value }))
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>折扣/减免</Label>
                  <Input
                    type="number"
                    value={couponForm.discount}
                    onChange={(event) =>
                      setCouponForm((form) => ({ ...form, discount: event.target.value }))
                    }
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>说明</Label>
                <Input
                  value={couponForm.description}
                  onChange={(event) =>
                    setCouponForm((form) => ({ ...form, description: event.target.value }))
                  }
                />
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>有效开始</Label>
                  <Input
                    type="date"
                    value={couponForm.validFrom}
                    onChange={(event) =>
                      setCouponForm((form) => ({ ...form, validFrom: event.target.value }))
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>有效结束</Label>
                  <Input
                    type="date"
                    value={couponForm.validUntil}
                    onChange={(event) =>
                      setCouponForm((form) => ({ ...form, validUntil: event.target.value }))
                    }
                    required
                  />
                </div>
              </div>
              <Button type="submit" disabled={couponMutation.isPending || !couponPartnerId}>
                新增联盟优惠券
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>联盟商户</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center text-sm text-slate-500">加载中...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-slate-500">
                    <th className="py-3 pr-4 font-medium">商户</th>
                    <th className="py-3 pr-4 font-medium">归属商家</th>
                    <th className="py-3 pr-4 font-medium">联系信息</th>
                    <th className="py-3 pr-4 font-medium">状态</th>
                    <th className="py-3 pr-4 font-medium">优惠券</th>
                    <th className="py-3 text-right font-medium">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.partners ?? []).map((partner) => (
                    <tr key={partner.id} className="border-b last:border-0">
                      <td className="py-3 pr-4 font-medium">
                        {partner.name}
                        <p className="text-xs font-normal text-slate-500">{partner.type ?? "-"}</p>
                      </td>
                      <td className="py-3 pr-4">{partner.merchantName}</td>
                      <td className="py-3 pr-4">
                        {partner.contactName ?? "-"} / {partner.contactPhone ?? "-"}
                      </td>
                      <td className="py-3 pr-4">
                        {partner.status === "ACTIVE" ? (
                          <Badge variant="success">合作中</Badge>
                        ) : (
                          <Badge variant="muted">停用</Badge>
                        )}
                      </td>
                      <td className="py-3 pr-4">{partner.couponsCount}</td>
                      <td className="py-3 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={deleteMutation.isPending}
                          onClick={() => deleteMutation.mutate({ type: "partner", id: partner.id })}
                        >
                          <Trash2 className="size-4" />
                          删除
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>联盟优惠券</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-slate-500">
                  <th className="py-3 pr-4 font-medium">优惠券</th>
                  <th className="py-3 pr-4 font-medium">联盟商户</th>
                  <th className="py-3 pr-4 font-medium">归属商家</th>
                  <th className="py-3 pr-4 font-medium">有效期</th>
                  <th className="py-3 pr-4 font-medium">领取数</th>
                  <th className="py-3 text-right font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {(data?.coupons ?? []).map((coupon) => (
                  <tr key={coupon.id} className="border-b last:border-0">
                    <td className="py-3 pr-4 font-medium">
                      {coupon.name}
                      <p className="text-xs font-normal text-slate-500">
                        {coupon.description ?? "-"} / {coupon.discount}
                      </p>
                    </td>
                    <td className="py-3 pr-4">{coupon.partnerName}</td>
                    <td className="py-3 pr-4">{coupon.merchantName}</td>
                    <td className="py-3 pr-4">
                      {coupon.validFrom.slice(0, 10)} ~ {coupon.validUntil.slice(0, 10)}
                    </td>
                    <td className="py-3 pr-4">{coupon.claimsCount}</td>
                    <td className="py-3 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={deleteMutation.isPending}
                        onClick={() => deleteMutation.mutate({ type: "coupon", id: coupon.id })}
                      >
                        <Trash2 className="size-4" />
                        删除
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
