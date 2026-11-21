import { PublishedContentPage } from '@/components/layout/published-content-page';

export default function PrivacyPolicyPage() {
  return <PublishedContentPage title="Privacy Policy" sections={[{ key: 'privacySectionsJson', heading: 'Privacy Policy' }]} />;
}
