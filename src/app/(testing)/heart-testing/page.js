import TestingServicePage from '@/components/testing-services/TestingServicePage';
import { generateMetadataFor } from '@/lib/seo';

export const generateMetadata = generateMetadataFor('/heart-testing');

export default function HeartTestingPage() {
	return <TestingServicePage pageKey="HeartTestingPage" items={{ sectionKey: 'cardiacTests', itemsKey: 'tests' }} />;
}
