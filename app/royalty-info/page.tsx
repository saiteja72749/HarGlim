import { PublishedContentPage } from '@/components/layout/published-content-page';

export default function RoyaltyInfoPage() {
  return <PublishedContentPage title="Royalty Information" summaryKey="royaltySummary" sections={[
    { key: 'royaltyScheduleJson', heading: 'Payment Schedule' },
    { key: 'royaltyExamplesJson', heading: 'Royalty Examples' },
    { key: 'royaltyFaqsJson', heading: 'Frequently Asked Questions' },
  ]} />;
}
