import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function PlatformSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-950">系统配置</h1>
        <p className="text-sm text-slate-500">平台级参数和合规配置入口。</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>配置状态</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-600">
          <p>当前 Sprint 4 不修改运行参数；后续可在这里接入平台公告、审核规则和合规文案配置。</p>
          <p>平台 API 权限已按 PLATFORM 角色隔离，商家后台与平台后台共用 session cookie 但不共享访问权限。</p>
        </CardContent>
      </Card>
    </div>
  );
}
