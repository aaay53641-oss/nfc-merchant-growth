import { CampaignSubmissionCenter } from "@/components/merchant/campaign-submission-center";

type PageProps = {
  params: { campaignId: string };
};

export default function Step2SubmissionsPage({ params }: PageProps) {
  return <CampaignSubmissionCenter campaignId={params.campaignId} step={2} />;
}
