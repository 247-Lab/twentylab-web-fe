import { getTranslations } from 'next-intl/server';
import {
	TestingServiceFinalCta,
	TestingServiceHero,
	TestingServiceHowItWorks,
	TestingServiceItems,
	TestingServiceList,
} from '@/components/testing-services/TestingServiceTemplate';

function InfoSection({ t, pageKey, sectionKey }) {
	return (
		<section className="bg-slate-50 px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
			<div className="mx-auto max-w-5xl">
				<h2 className="font-display mb-6 text-3xl font-bold text-slate-900 sm:text-4xl">
					{t(`${pageKey}.${sectionKey}.title`)}
				</h2>
				<p className="text-base leading-relaxed text-slate-700 sm:text-lg">
					{t(`${pageKey}.${sectionKey}.description`)}
				</p>
			</div>
		</section>
	);
}

export default async function TestingServicePage({ pageKey, items, list, infoSectionKey }) {
	const t = await getTranslations();

	return (
		<main className="bg-white">
			<TestingServiceHero t={t} pageKey={pageKey} />
			{list ? <TestingServiceList t={t} pageKey={pageKey} {...list} /> : null}
			<TestingServiceHowItWorks t={t} pageKey={pageKey} />
			{infoSectionKey ? <InfoSection t={t} pageKey={pageKey} sectionKey={infoSectionKey} /> : null}
			<TestingServiceItems t={t} pageKey={pageKey} {...items} />
			<TestingServiceFinalCta
				title={t(`${pageKey}.cta.title`)}
				description={t(`${pageKey}.cta.description`)}
				buttonText={t(`${pageKey}.cta.buttonText`)}
			/>
		</main>
	);
}
