import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function MerchantNfcCardsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-950">NFC卡管理</h1>
        <p className="text-sm text-slate-500">查看和维护门店 NFC 桌贴、卡片绑定关系。</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">待接入</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-slate-500">
          当前任务只要求补齐导航入口。NFC 卡片绑定和批量制卡能力可在后续任务实现。
        </CardContent>
      </Card>
    </div>
  );
}
