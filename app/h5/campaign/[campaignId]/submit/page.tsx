"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function SubmitPage() {
  const [submissionType, setSubmissionType] = useState<"image" | "link">("image");
  const [imageUrl, setImageUrl] = useState("");
  const [link, setLink] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    // Mock submission
    setTimeout(() => {
      setIsSubmitting(false);
      alert("提交成功！请等待审核");
    }, 1500);
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-gray-900 mb-4">上传凭证</h2>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">选择提交方式</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Button
              variant={submissionType === "image" ? "default" : "outline"}
              className="flex-1"
              onClick={() => setSubmissionType("image")}
            >
              图片上传
            </Button>
            <Button
              variant={submissionType === "link" ? "default" : "outline"}
              className="flex-1"
              onClick={() => setSubmissionType("link")}
            >
              链接提交
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">
            {submissionType === "image" ? "上传截图" : "提交链接"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {submissionType === "image" ? (
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
                  <p className="text-sm text-gray-500">点击上传截图</p>
                  <Input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    id="screenshot-upload"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setImageUrl(URL.createObjectURL(file));
                      }
                    }}
                  />
                  <label htmlFor="screenshot-upload">
                    <Button variant="outline" size="sm" className="mt-2" asChild>
                      <span>选择图片</span>
                    </Button>
                  </label>
                </div>
              )}
            </div>
          ) : (
            <Input
              placeholder="请粘贴分享链接"
              value={link}
              onChange={(e) => setLink(e.target.value)}
            />
          )}
        </CardContent>
      </Card>

      <Button
        className="w-full"
        onClick={handleSubmit}
        disabled={
          isSubmitting ||
          (submissionType === "image" ? !imageUrl : !link)
        }
      >
        {isSubmitting ? "提交中..." : "提交凭证"}
      </Button>
    </div>
  );
}
