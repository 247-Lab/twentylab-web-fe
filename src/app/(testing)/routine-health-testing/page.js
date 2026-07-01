import TestingServicePage from '@/components/testing-services/TestingServicePage';
import { generateMetadataFor } from '@/lib/seo';

export const generateMetadata = generateMetadataFor('/routine-health-testing');

export default function RoutineHealthTestingPage() {
	return (
		<TestingServicePage
			pageKey="RoutineHealthTestingPage"
			list={{ sectionKey: 'servicesList', itemsKey: 'services' }}
			items={{ sectionKey: 'healthTests', itemsKey: 'tests' }}
		/>
	);
}
