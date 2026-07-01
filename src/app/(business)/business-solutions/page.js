import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { Stethoscope, Briefcase, Scale, Star, ArrowRight } from 'lucide-react';
import { generateMetadataFor } from '@/lib/seo';

export const generateMetadata = generateMetadataFor('/business-solutions');

export default async function BusinessSolutionPage() {
	const t = await getTranslations('BusinessSolutionPage');
	const sections = t.raw('sections');
	const highlights = t.raw('highlights');
	const features = t.raw('features.items');
	const cta = t.raw('cta');

	const sectionIcons = [Stethoscope, Briefcase, Scale];
	const sectionImages = [
		'/images/img-02-1-1024x683-1-600x400.jpg',
		'/images/pexels-rodnae-productions-6129507-1024x683-1-600x400.jpg',
		'/images/Regional-Environmental-Panel-1-300x300.jpg',
	];

	return (
		<main className="bg-white">
			{/* Hero Section */}
			<section className="relative overflow-hidden bg-gradient-to-br from-[var(--tl-primary)] via-[#0b68c8] to-[#3ca2f5] px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
				<div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_92%_8%,rgba(255,255,255,0.26),transparent_35%)]" />
				<div className="pointer-events-none absolute inset-0 bg-[linear-gradient(165deg,rgba(255,255,255,0.08)_0%,transparent_42%,rgba(8,40,66,0.32)_100%)]" />

				<div className="relative mx-auto max-w-6xl text-center">
					<h1 className="font-display mb-6 text-4xl leading-tight font-bold text-white sm:text-5xl lg:text-6xl">
						{t('hero.title')}
					</h1>
					<p className="mx-auto max-w-3xl text-base leading-relaxed text-blue-50 sm:text-lg">{t('hero.subtitle')}</p>
					<div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row sm:gap-4">
						<Link
							href="tel:+18139323741"
							className="text-var-tl-primary inline-flex items-center justify-center rounded-lg bg-white px-8 py-3 font-semibold transition-all duration-200 hover:bg-blue-50 hover:shadow-lg"
						>
							{t('hero.callNow')}
						</Link>
					</div>
				</div>
			</section>

			{/* Solutions Sections */}
			<div>
				{sections.map((section, index) => {
					const Icon = sectionIcons[index] || Stethoscope;
					return (
						<section
							key={index}
							className={`px-4 py-12 sm:px-6 sm:py-16 lg:px-8 ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}
						>
							<div className="mx-auto max-w-6xl">
								<div className="grid grid-cols-1 items-center gap-8 md:grid-cols-2 md:gap-12">
									<div className={index % 2 === 1 ? 'md:order-2' : ''}>
										<div className="mb-6 flex items-center gap-4">
											<div className="from-var-tl-primary flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br to-blue-600">
												<Icon className="h-7 w-7 text-white" />
											</div>
											<h2 className="font-display text-3xl font-bold text-slate-900 sm:text-4xl">{section.title}</h2>
										</div>
										<p className="mb-8 text-base leading-relaxed text-slate-700 sm:text-lg">{section.body}</p>
										<Link
											href={section.ctaHref}
											className="bg-var-tl-primary hover:bg-opacity-90 inline-flex items-center justify-center gap-2 rounded-lg px-8 py-3 font-semibold text-white transition-all duration-200 hover:shadow-lg"
										>
											{section.cta}
											<ArrowRight className="h-5 w-5" />
										</Link>
									</div>
									<div className={`${index % 2 === 1 ? 'md:order-1' : ''}`}>
										<div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md">
											<Image
												src={sectionImages[index] || sectionImages[0]}
												alt={section.title}
												width={960}
												height={720}
												className="h-96 w-full object-cover sm:h-[400px]"
											/>
										</div>
									</div>
								</div>
							</div>
						</section>
					);
				})}
			</div>

			{/* Why Choose Us Section */}
			<section className="from-var-tl-primary/5 relative overflow-hidden bg-gradient-to-r to-blue-600/5 px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
				<div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(38,127,199,0.08),transparent_40%)]" />

				<div className="relative mx-auto max-w-6xl">
					<div className="mb-12 text-center">
						<h2 className="font-display mb-4 text-3xl font-bold text-slate-900 sm:text-4xl">
							{t('whyChooseUs.title')}
						</h2>
					</div>

					<div className="grid grid-cols-1 gap-6 md:grid-cols-3 lg:gap-8">
						{highlights.map((item, idx) => {
							const sectionHighlightIcons = [Star, Stethoscope, Briefcase];
							const ItemIcon = sectionHighlightIcons[idx % sectionHighlightIcons.length];
							return (
								<div
									key={idx}
									className="rounded-[1.5rem] border border-slate-200 bg-white p-8 text-center shadow-sm transition-shadow hover:shadow-md"
								>
									<ItemIcon className="text-var-tl-primary mx-auto mb-4 h-10 w-10" />
									<h3 className="mb-3 text-lg font-semibold text-slate-900">{item.title}</h3>
									<p className="text-sm leading-relaxed text-slate-700">{item.desc}</p>
								</div>
							);
						})}
					</div>

					<div className="mt-12 rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm sm:p-12">
						<p className="text-center text-base leading-relaxed text-slate-700 sm:text-lg">{t('whyChooseUs.body')}</p>
					</div>
				</div>
			</section>

			{/* Features Section */}
			<section className="px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
				<div className="mx-auto max-w-5xl">
					<div className="mb-12 text-center">
						<h2 className="font-display mb-4 text-3xl font-bold text-slate-900 sm:text-4xl">{t('features.title')}</h2>
					</div>

					<div className="grid grid-cols-1 gap-6 md:grid-cols-2">
						{features.map((item, idx) => (
							<div
								key={idx}
								className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-6 transition-all hover:bg-white hover:shadow-md"
							>
								<div className="bg-var-tl-primary/10 mb-3 flex h-10 w-10 items-center justify-center rounded-full">
									<span className="text-var-tl-primary font-bold">✓</span>
								</div>
								<h3 className="mb-2 font-semibold text-slate-900">{item.title}</h3>
								<p className="text-sm leading-relaxed text-slate-700">{item.desc}</p>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* CTA Section */}
			<section className="relative overflow-hidden bg-[linear-gradient(135deg,#ffffff_0%,#f4f9ff_100%)] px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
				<div className="relative mx-auto max-w-4xl text-center">
					<h2 className="font-display mb-4 text-3xl font-bold text-[var(--tl-metallic-black)] sm:text-4xl">
						{cta.title}
					</h2>
					<p className="mb-8 text-base leading-relaxed text-slate-700 sm:text-lg">{cta.body}</p>
					<div className="flex flex-col justify-center gap-3 sm:flex-row sm:gap-4">
						<Link
							href="/contact"
							className="inline-flex items-center justify-center rounded-lg bg-[var(--tl-primary)] px-8 py-3 font-semibold text-white transition-all duration-200 hover:bg-[var(--tl-primary-strong)] hover:shadow-lg"
						>
							{cta.primaryButton}
						</Link>
						<Link
							href="tel:+18139323741"
							className="inline-flex items-center justify-center rounded-lg border-2 border-sky-200 px-8 py-3 font-semibold text-[var(--tl-primary-strong)] transition-all duration-200 hover:border-[var(--tl-primary)] hover:text-[var(--tl-primary)]"
						>
							{cta.secondaryButton}
						</Link>
					</div>
				</div>
			</section>
		</main>
	);
}
