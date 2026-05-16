"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Edit2, Eye, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";

type StoreDto = {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  campaignsCount: number;
  nfcCardsCount: number;
};

type StoresResponse = {
  stores: StoreDto[];
};

type StoreForm = {
  name: string;
  address: string;
  phone: string;
};

const emptyForm: StoreForm = {
  name: "",
  address: "",
  phone: "",
};

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error ?? "请求失败");
  }

  return data as T;
}

function toForm(store: StoreDto | null): StoreForm {
  if (!store) return emptyForm;

  return {
    name: store.name,
    address: store.address ?? "",
    phone: store.phone ?? "",
  };
}

export default function StoresPage() {
  const queryClient = useQueryClient();
  const [editingStore, setEditingStore] = useState<StoreDto | null>(null);
  const [deletingStore, setDeletingStore] = useState<StoreDto | null>(null);
  const [form, setForm] = useState<StoreForm>(emptyForm);
  const [formOpen, setFormOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["merchant-stores"],
    queryFn: () => requestJson<StoresResponse>("/api/stores"),
  });

  const stores = data?.stores ?? [];
  const totalNfcCards = stores.reduce((sum, store) => sum + store.nfcCardsCount, 0);

  const saveStore = useMutation({
    mutationFn: async () => {
      const payload = JSON.stringify(form);

      if (editingStore) {
        return requestJson<{ store: StoreDto }>(`/api/stores/${editingStore.id}`, {
          method: "PATCH",
          body: payload,
        });
      }

      return requestJson<{ store: StoreDto }>("/api/stores", {
        method: "POST",
        body: payload,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["merchant-stores"] });
      setFormOpen(false);
      setEditingStore(null);
      setForm(emptyForm);
      toast({ title: "门店已保存" });
    },
    onError: (error) => {
      toast({ title: "保存失败", description: error.message });
    },
  });

  const deleteStore = useMutation({
    mutationFn: async (storeId: string) =>
      requestJson<{ ok: true }>(`/api/stores/${storeId}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["merchant-stores"] });
      setDeletingStore(null);
      toast({ title: "门店已删除" });
    },
    onError: (error) => {
      toast({ title: "删除失败", description: error.message });
    },
  });

  function openCreateDialog() {
    setEditingStore(null);
    setForm(emptyForm);
    setFormOpen(true);
  }

  function openEditDialog(store: StoreDto) {
    setEditingStore(store);
    setForm(toForm(store));
    setFormOpen(true);
  }

  function updateForm(key: keyof StoreForm, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">门店管理</h1>
          <p className="text-sm text-slate-500">维护门店信息，并查看门店关联活动。</p>
        </div>
        <Button type="button" onClick={openCreateDialog}>
          <Plus className="size-4" />
          新增门店
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-slate-500">门店数</p>
            <p className="mt-2 text-2xl font-semibold">{stores.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-slate-500">活动数</p>
            <p className="mt-2 text-2xl font-semibold">
              {stores.reduce((sum, store) => sum + store.campaignsCount, 0)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-slate-500">NFC卡片数</p>
            <p className="mt-2 text-2xl font-semibold">{totalNfcCards}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">门店列表</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-12 text-center text-sm text-slate-500">加载中...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="border-b text-left text-slate-500">
                    <th className="px-4 py-3 font-medium">门店名称</th>
                    <th className="px-4 py-3 font-medium">地址</th>
                    <th className="px-4 py-3 font-medium">电话</th>
                    <th className="px-4 py-3 font-medium">活动</th>
                    <th className="px-4 py-3 font-medium">NFC卡</th>
                    <th className="px-4 py-3 text-right font-medium">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {stores.map((store) => (
                    <tr key={store.id} className="border-b last:border-0">
                      <td className="px-4 py-3 font-medium">{store.name}</td>
                      <td className="px-4 py-3 text-slate-600">{store.address || "-"}</td>
                      <td className="px-4 py-3 text-slate-600">{store.phone || "-"}</td>
                      <td className="px-4 py-3">
                        <Badge variant="secondary">{store.campaignsCount}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline">{store.nfcCardsCount}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <Button asChild variant="ghost" size="sm">
                            <Link href={`/merchant/campaigns?storeId=${store.id}`}>
                              <Eye className="size-4" />
                              查看活动
                            </Link>
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(store)}
                          >
                            <Edit2 className="size-4" />
                            编辑
                          </Button>
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => setDeletingStore(store)}
                          >
                            <Trash2 className="size-4" />
                            删除
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingStore ? "编辑门店" : "新增门店"}</DialogTitle>
            <DialogDescription>填写门店名称、地址和联系电话。</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="store-name">门店名称</Label>
              <Input
                id="store-name"
                value={form.name}
                onChange={(event) => updateForm("name", event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="store-address">地址</Label>
              <Input
                id="store-address"
                value={form.address}
                onChange={(event) => updateForm("address", event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="store-phone">电话</Label>
              <Input
                id="store-phone"
                value={form.phone}
                onChange={(event) => updateForm("phone", event.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
                取消
              </Button>
              <Button
                type="button"
                onClick={() => saveStore.mutate()}
                disabled={!form.name.trim() || saveStore.isPending}
              >
                保存
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deletingStore)} onOpenChange={() => setDeletingStore(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>删除门店</DialogTitle>
            <DialogDescription>
              删除后不可恢复。存在活动、NFC 卡片或员工关联的门店会被 API 拒绝删除。
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setDeletingStore(null)}>
              取消
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={!deletingStore || deleteStore.isPending}
              onClick={() => deletingStore && deleteStore.mutate(deletingStore.id)}
            >
              确认删除
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
