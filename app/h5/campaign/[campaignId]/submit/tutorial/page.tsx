import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { LinkTutorialContent } from "@/components/h5/link-tutorial";
import { Button } from "@/components/ui/button";

export default function SubmitTutorialPage({
  params,
}: {
  params: { campaignId: string };
}) {
  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-orange-100 bg-white/95 p-4 shadow-[0_18px_42px_-34px_rgba(255,90,44,0.65)]">
        <Button variant="ghost" size="sm" className="-ml-2 mb-2" asChild>
          <Link href={`/h5/campaign/${params.campaignId}/submit`}>
            <ChevronLeft className="mr-1 h-4 w-4" />
            返回提交
          </Link>
        </Button>
        <h1 className="text-2xl font-black tracking-tight text-slate-950">复制链接教程</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          找到发布内容后复制链接，回到提交页粘贴即可。找不到链接时可上传截图。
        </p>
      </section>

      <LinkTutorialContent />
    </div>
  );
}
