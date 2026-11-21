import { PublishedContentPage } from '@/components/layout/published-content-page';

export default function TermsOfServicePage() {
  return <PublishedContentPage title="Terms of Service" sections={[{ key: 'termsSectionsJson', heading: 'Terms of Service' }]} />;
}
