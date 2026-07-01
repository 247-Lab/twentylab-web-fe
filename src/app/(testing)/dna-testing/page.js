import TestingServicePage from '@/components/testing-services/TestingServicePage';
import { generateMetadataFor } from '@/lib/seo';

export const generateMetadata = generateMetadataFor('/dna-testing');

export default function DnaTestingPage() {
	return <TestingServicePage pageKey="DnaTestingPage" items={{ sectionKey: 'dnaTests', itemsKey: 'tests' }} />;
}
