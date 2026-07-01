import { getTranslations } from 'next-intl/server';
import {
	TestingServiceHero,
	TestingServiceHowItWorks,
	TestingServiceFinalCta,
} from '@/components/testing-services/TestingServiceTemplate';
import { generateMetadataFor } from '@/lib/seo';
import HormonePackages from '@/components/testing-services/HormonePackages';

export const generateMetadata = generateMetadataFor('/hormone-testing');

const pageKey = 'HormoneTestingPage';

export default async function HormoneTestingPage() {
	const t = await getTranslations();

	return (
		<main className="bg-white">
			<TestingServiceHero t={t} pageKey={pageKey} />
			<TestingServiceHowItWorks t={t} pageKey={pageKey} />
			<HormonePackages t={t} pageKey={pageKey} />
			<TestingServiceFinalCta
				title={t(`${pageKey}.cta.title`)}
				description={t(`${pageKey}.cta.description`)}
				buttonText={t(`${pageKey}.cta.buttonText`)}
			/>
		</main>
	);
}
