"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function AICopyPage() {
  const [imageUrl, setImageUrl] = useState("");
  const [generatedCopy, setGeneratedCopy] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    setIsGenerating(true);
    // Mock AI generation
    setTimeout(() => {
      setGeneratedCopy(
        "🏪 发现一家超棒的门店！\n\n📍 位置：市中心商业街\n💡 特色：独特的装修风格\n🛍️ 商品：种类丰富，价格实惠\n\n快来打卡吧！#寻宝活动 #门店打卡"
      );
      setIsGenerating(false);
    }, 2000);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedCopy);
    alert("已复制到剪贴板");
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-gray-900 mb-4">AI文案生成</h2>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">上传图片</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            {imageUrl ? (
              <div className="space-y-4">
                <img
                  src={imageUrl}
                  alt="Preview"
                  className="max-h-48 mx-auto rounded-lg"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setImageUrl("")}
                >
                  重新上传
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <svg
                  className="w-12 h-12 mx-auto text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <p className="text-sm text-gray-500">点击或拖拽上传图片</p>
                <Input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  id="image-upload"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setImageUrl(URL.createObjectURL(file));
                    }
                  }}
                />
                <label htmlFor="image-upload">
                  <Button variant="outline" size="sm" className="mt-2" asChild>
                    <span>选择图片</span>
                  </Button>
                </label>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Button
        className="w-full"
        onClick={handleGenerate}
        disabled={!imageUrl || isGenerating}
      >
        {isGenerating ? "生成中..." : "生成文案"}
      </Button>

      {generatedCopy && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-medium">生成的文案</CardTitle>
              <Button size="sm" onClick={handleCopy}>
                复制
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-700 whitespace-pre-line">
              {generatedCopy}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
