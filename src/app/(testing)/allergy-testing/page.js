import TestingServicePage from '@/components/testing-services/TestingServicePage';
import { generateMetadataFor } from '@/lib/seo';

export const generateMetadata = generateMetadataFor('/allergy-testing');

export default function AllergyTestingPage() {
	return (
		<TestingServicePage pageKey="AllergyTestingPage" items={{ sectionKey: 'allergyPanels', itemsKey: 'panels' }} />
	);
}
