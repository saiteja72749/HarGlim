import { PublishedContentPage } from '@/components/layout/published-content-page';

export default function AuthorGuidelinesPage() {
  return <PublishedContentPage title="Author Guidelines" summaryKey="authorGuidelinesText" sections={[
    { key: 'guidelinesSectionsJson', heading: 'Submission Guidelines' },
    { key: 'guidelinesStepsJson', heading: 'Submission Process' },
  ]} />;
}
