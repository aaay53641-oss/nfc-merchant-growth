"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function MerchantLoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">商家登录</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">邮箱</label>
              <input
                type="email"
                className="w-full h-10 px-3 border rounded-md"
                placeholder="请输入邮箱"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">密码</label>
              <input
                type="password"
                className="w-full h-10 px-3 border rounded-md"
                placeholder="请输入密码"
              />
            </div>
            <Button className="w-full">登录</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
