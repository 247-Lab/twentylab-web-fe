import TestingServicePage from '@/components/testing-services/TestingServicePage';
import { generateMetadataFor } from '@/lib/seo';

export const generateMetadata = generateMetadataFor('/drug-testing');

export default function DrugTestingPage() {
	return (
		<TestingServicePage
			pageKey="DrugTestingPage"
			items={{ sectionKey: 'drugTestTypes', itemsKey: 'tests' }}
			infoSectionKey="selfDrugTesting"
		/>
	);
}
