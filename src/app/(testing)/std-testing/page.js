import TestingServicePage from '@/components/testing-services/TestingServicePage';
import { generateMetadataFor } from '@/lib/seo';

export const generateMetadata = generateMetadataFor('/std-testing');

export default function StdTestingPage() {
	return <TestingServicePage pageKey="StdTestingPage" items={{ sectionKey: 'stdTypes', itemsKey: 'tests' }} />;
}
