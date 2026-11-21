import { PublishedContentPage } from '@/components/layout/published-content-page';

export default function ReturnsPolicyPage() {
  return <PublishedContentPage title="Returns Policy" sections={[
    { key: 'returnsStepsJson', heading: 'Return Process' },
    { key: 'returnsEligibleJson', heading: 'Eligible Returns' },
    { key: 'returnsNotEligibleJson', heading: 'Ineligible Returns' },
    { key: 'returnsFaqsJson', heading: 'Frequently Asked Questions' },
  ]} />;
}
