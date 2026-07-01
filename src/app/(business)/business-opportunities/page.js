import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { CheckCircle, Users, TrendingUp, HeartHandshake } from 'lucide-react';
import BusinessOpportunitiesFaq from './BusinessOpportunitiesFaq';
import { generateMetadataFor } from '@/lib/seo';

export const generateMetadata = generateMetadataFor('/business-opportunities');

export default async function BusinessOpportunitiesPage() {
	const t = await getTranslations('BusinessOpportunitiesPage');
	const benefits = t.raw('benefits.items');
	const faqs = t.raw('faq.questions');
	const teamCards = t.raw('team.cards');

	return (
		<main className="bg-white">
			{/* Hero Section */}
			<section className="relative overflow-hidden bg-gradient-to-br from-[var(--tl-primary)] via-[#0b68c8] to-[#3ca2f5] px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
				<div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_92%_8%,rgba(255,255,255,0.26),transparent_35%)]" />
				<div className="pointer-events-none absolute inset-0 bg-[linear-gradient(165deg,rgba(255,255,255,0.08)_0%,transparent_42%,rgba(8,40,66,0.32)_100%)]" />

				<div className="relative mx-auto grid max-w-6xl grid-cols-1 items-center gap-8 md:grid-cols-2 md:gap-12">
					<div>
						<div className="mb-6 flex flex-col gap-2">
							<span className="text-sm font-semibold tracking-[0.12em] text-blue-100 uppercase">
								{t('hero.overline')}
							</span>
							<h1 className="font-display text-4xl leading-tight font-bold text-white sm:text-5xl lg:text-6xl">
								{t('hero.title')}
							</h1>
						</div>
						<p className="mb-8 max-w-2xl text-base leading-relaxed text-blue-50 sm:text-lg">{t('hero.description')}</p>
						<div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
							<Link
								href="/contact"
								className="text-var-tl-primary inline-flex items-center justify-center rounded-lg bg-white px-8 py-3 font-semibold transition-all duration-200 hover:bg-blue-50 hover:shadow-lg"
							>
								{t('cta.buttonText')}
							</Link>
							<Link
								href="tel:+18139323741"
								className="inline-flex items-center justify-center rounded-lg border-2 border-white px-8 py-3 font-semibold text-white transition-all duration-200 hover:border-blue-50 hover:text-blue-50"
							>
								{t('hero.callButton')}
							</Link>
						</div>
					</div>

					<div className="relative mx-auto hidden w-full max-w-md md:block">
						<div className="relative overflow-hidden rounded-[2rem] border-[3px] border-white/20 shadow-2xl">
							<Image
								src="/images/8_About_Business_Consulting_Company-Hero-Img_1.jpg"
								alt={t('hero.title')}
								width={920}
								height={700}
								className="h-auto w-full object-cover"
								priority
							/>
						</div>
					</div>
				</div>
			</section>

			{/* Mission Section */}
			<section className="px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
				<div className="mx-auto max-w-5xl text-center">
					<h2 className="font-display mb-6 text-3xl font-bold text-slate-900 sm:text-4xl">{t('team.title')}</h2>
					<p className="mx-auto mb-12 max-w-3xl text-base leading-relaxed text-slate-700 sm:text-lg">
						{t('team.intro')}
					</p>

					<div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
						{teamCards.map((item, index) => {
							const icons = [TrendingUp, HeartHandshake, CheckCircle];
							const Icon = icons[index % icons.length];
							return (
								<div
									key={index}
									className="rounded-[1.5rem] border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-8 shadow-sm transition-shadow hover:shadow-md"
								>
									<Icon className="text-var-tl-primary mb-4 h-8 w-8" />
									<h3 className="mb-3 text-lg font-semibold text-slate-900">{item.title}</h3>
									<p className="text-sm leading-relaxed text-slate-700">{item.desc}</p>
								</div>
							);
						})}
					</div>
				</div>
			</section>

			{/* Benefits Section */}
			<section className="bg-slate-50 px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
				<div className="mx-auto max-w-5xl">
					<div className="mb-12 text-center">
						<h2 className="font-display mb-4 text-3xl font-bold text-slate-900 sm:text-4xl">{t('benefits.title')}</h2>
						<p className="text-base leading-relaxed text-slate-700 sm:text-lg">{t('benefits.intro')}</p>
					</div>

					<div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
						{benefits.map((benefit, index) => (
							<div
								key={index}
								className="group hover:border-var-tl-primary/30 rounded-[1.75rem] border border-slate-200 bg-white p-8 transition-all duration-300 hover:shadow-lg"
							>
								<div className="from-var-tl-primary mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br to-blue-600 transition-all group-hover:shadow-lg">
									<CheckCircle className="h-6 w-6 text-white" />
								</div>
								<h3 className="mb-3 text-lg font-semibold text-slate-900">{benefit.title}</h3>
								<p className="text-base leading-relaxed text-slate-700">{benefit.description}</p>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* FAQ Section - Using client component for interactivity */}
			<BusinessOpportunitiesFaq title={t('faq.title')} faqs={faqs} />

			{/* Final CTA Section */}
			<section className="relative overflow-hidden bg-[linear-gradient(135deg,#ffffff_0%,#f4f9ff_100%)] px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
				<div className="relative mx-auto max-w-4xl text-center">
					<h2 className="font-display mb-4 text-3xl font-bold text-[var(--tl-metallic-black)] sm:text-4xl">
						{t('cta.title')}
					</h2>
					<p className="mb-8 text-base leading-relaxed text-slate-700 sm:text-lg">{t('cta.body')}</p>
					<div className="flex flex-col justify-center gap-3 sm:flex-row sm:gap-4">
						<Link
							href="/contact"
							className="inline-flex items-center justify-center rounded-lg bg-[var(--tl-primary)] px-8 py-3 font-semibold text-white transition-all duration-200 hover:bg-[var(--tl-primary-strong)] hover:shadow-lg"
						>
							{t('cta.buttonText')}
						</Link>
						<Link
							href="tel:+18139323741"
							className="inline-flex items-center justify-center rounded-lg border-2 border-sky-200 px-8 py-3 font-semibold text-[var(--tl-primary-strong)] transition-all duration-200 hover:border-[var(--tl-primary)] hover:text-[var(--tl-primary)]"
						>
							{t('cta.callButton')}
						</Link>
					</div>
				</div>
			</section>
		</main>
	);
}
