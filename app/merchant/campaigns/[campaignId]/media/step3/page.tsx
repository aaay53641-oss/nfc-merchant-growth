import { CampaignMediaManager } from "@/components/merchant/campaign-media-manager";

type PageProps = {
  params: { campaignId: string };
};

export default function Step3MediaPage({ params }: PageProps) {
  return <CampaignMediaManager campaignId={params.campaignId} step={3} />;
}
