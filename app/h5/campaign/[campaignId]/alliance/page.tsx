"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { fetchH5AllianceCoupons, type AllianceCouponDto } from "@/lib/h5/api";

export default function AlliancePage() {
  const { data: coupons, isLoading } = useQuery({
    queryKey: ["allianceCoupons"],
    queryFn: fetchH5AllianceCoupons,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-gray-900 mb-4">异业优惠券</h2>
      <p className="text-sm text-gray-600 mb-4">
        完成活动任务即可获得以下商家优惠券
      </p>

      <div className="space-y-4">
        {coupons?.map((coupon) => (
          <Card key={coupon.id} className="overflow-hidden">
            <div className="flex">
              <div className="w-24 bg-gradient-to-b from-blue-500 to-purple-600 flex flex-col items-center justify-center text-white p-4">
                <span className="text-2xl font-bold">{coupon.discount}%</span>
                <span className="text-xs">OFF</span>
              </div>
              <div className="flex-1">
                <CardHeader className="pb-1">
                  <CardTitle className="text-base font-medium">
                    {coupon.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-sm text-gray-600 mb-1">
                    {coupon.description}
                  </p>
                  <p className="text-xs text-gray-500 mb-2">
                    {coupon.partnerName}
                  </p>
                  <Button size="sm" className="w-full">
                    立即领取
                  </Button>
                </CardContent>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
