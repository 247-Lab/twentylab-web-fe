import Image from 'next/image';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { ArrowRight, BadgeCheck, CheckCircle2, Clock3, FlaskConical, Mail, MapPin, PhoneCall } from 'lucide-react';
import { generateMetadataFor } from '@/lib/seo';

export const generateMetadata = generateMetadataFor('/about');

export default async function AboutPage() {
	const t = await getTranslations('AboutPage');

	const serviceHighlights = t.raw('serviceHighlights');
	const whyChooseUs = t.raw('whyChooseUs');

	return (
		<div className="min-h-screen bg-[linear-gradient(180deg,#f4f8ff_0%,#ffffff_44%)] text-[var(--tl-ink)]">
			<main>
				<section className="mx-auto w-full max-w-[1220px] px-4 pt-14 pb-14 lg:px-6">
					<div className="grid items-center gap-10 lg:grid-cols-[1.04fr_0.96fr]">
						<div>
							<p className="text-sm font-bold tracking-[0.18em] text-[var(--tl-primary)] uppercase">{t('eyebrow')}</p>
							<h1 className="font-display mt-3 text-4xl leading-tight font-black text-[var(--tl-metallic-black)] md:text-5xl">
								{t('heroTitle')}
							</h1>
							<p className="mt-5 max-w-2xl text-base leading-relaxed text-slate-600 md:text-lg">{t('heroBody')}</p>

							<div className="mt-8 grid gap-3 sm:grid-cols-3">
								<div className="rounded-2xl border border-[#cfe0fa] bg-white p-4 shadow-sm shadow-[#173469]/10">
									<Clock3 className="h-5 w-5 text-[var(--tl-primary)]" />
									<p className="mt-2 text-sm font-semibold text-slate-700">{t('stats.open247')}</p>
								</div>
								<div className="rounded-2xl border border-[#cfe0fa] bg-white p-4 shadow-sm shadow-[#173469]/10">
									<BadgeCheck className="h-5 w-5 text-[var(--tl-primary)]" />
									<p className="mt-2 text-sm font-semibold text-slate-700">{t('stats.certifiedTeam')}</p>
								</div>
								<div className="rounded-2xl border border-[#cfe0fa] bg-white p-4 shadow-sm shadow-[#173469]/10">
									<MapPin className="h-5 w-5 text-[var(--tl-primary)]" />
									<p className="mt-2 text-sm font-semibold text-slate-700">{t('stats.locations')}</p>
								</div>
							</div>
						</div>

						<div className="hidden rounded-3xl border border-[#cfe0fa] bg-white p-3 shadow-[0_34px_80px_-42px_rgba(17,58,123,0.62)] lg:block">
							<Image
								src="/images/24-7labs-business-oppurtunities-1536x1280.jpg"
								alt={t('images.locationAlt')}
								width={760}
								height={520}
								className="h-auto w-full rounded-2xl object-cover"
								priority
							/>
						</div>
					</div>
				</section>

				<section className="bg-white py-14">
					<div className="mx-auto w-full max-w-[1220px] px-4 lg:px-6">
						<div className="grid gap-8 lg:grid-cols-[1.02fr_0.98fr]">
							<article className="rounded-3xl border border-[#cfe0fa] bg-[linear-gradient(145deg,#eef5ff_0%,#f8fbff_75%)] p-7 shadow-[0_20px_55px_-42px_rgba(10,15,25,0.8)]">
								<h2 className="font-display text-3xl font-extrabold text-[var(--tl-metallic-black)]">
									{t('sectionLabTitle')}
								</h2>
								<p className="mt-4 text-base leading-relaxed text-slate-600">{t('sectionLabBody')}</p>
								<ul className="mt-6 grid gap-2 sm:grid-cols-2">
									{serviceHighlights.map((item) => (
										<li key={item} className="flex items-start gap-2 text-sm text-slate-700">
											<FlaskConical className="mt-0.5 h-4 w-4 shrink-0 text-[var(--tl-primary)]" />
											<span>{item}</span>
										</li>
									))}
								</ul>
							</article>

							<article className="rounded-3xl border border-[#1f4f9d]/20 bg-[linear-gradient(140deg,#1a3f91_0%,#133473_45%,#05070d_100%)] p-7 text-white shadow-[0_30px_70px_-40px_rgba(3,7,16,0.95)]">
								<p className="text-xs font-bold tracking-[0.18em] text-[var(--tl-primary-soft)] uppercase">
									{t('stillLooking')}
								</p>
								<h3 className="font-display mt-2 text-3xl font-black">{t('stillTitle')}</h3>
								<ul className="mt-6 space-y-3">
									{whyChooseUs.map((item) => (
										<li key={item} className="flex gap-2.5 text-sm leading-relaxed text-blue-100/95">
											<CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--tl-primary-soft)]" />
											<span>{item}</span>
										</li>
									))}
								</ul>
							</article>
						</div>
					</div>
				</section>

				<section className="py-14">
					<div className="mx-auto w-full max-w-[1220px] px-4 lg:px-6">
						<div className="mb-8 flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-end sm:gap-4">
							<h2 className="font-display text-3xl font-extrabold text-[var(--tl-metallic-black)] md:text-4xl">
								{t('managementTitle')}
							</h2>
							<p className="text-sm font-semibold text-[var(--tl-primary-strong)] sm:text-right md:text-base">
								{t('managementSubtitle')}
							</p>
						</div>

						<div className="grid gap-6 lg:grid-cols-2">
							<article className="rounded-3xl border border-[#cfe0fa] bg-white p-6 shadow-[0_24px_48px_-40px_rgba(5,7,13,0.9)]">
								<div className="flex flex-col gap-4 sm:flex-row sm:items-start">
									<Image
										src="/images/marley-roldan.jpeg"
										alt={t('images.marleyAlt')}
										width={210}
										height={210}
										className="h-44 w-44 rounded-2xl object-cover sm:h-48 sm:w-48"
									/>
									<div>
										<h3 className="font-display text-2xl font-extrabold text-[var(--tl-metallic-black)]">
											{t('management.marleyName')}
										</h3>
										<p className="mt-1 text-sm font-bold tracking-[0.14em] text-[var(--tl-primary)] uppercase">
											{t('management.marleyRole')}
										</p>
										<p className="mt-3 text-sm leading-relaxed text-slate-600">{t('management.marleyBio')}</p>
									</div>
								</div>
							</article>

							<article className="rounded-3xl border border-[#cfe0fa] bg-white p-6 shadow-[0_24px_48px_-40px_rgba(5,7,13,0.9)]">
								<div className="flex flex-col gap-4 sm:flex-row sm:items-start">
									<Image
										src="/images/wilson-molina.avif"
										alt={t('images.molinaAlt')}
										width={210}
										height={210}
										className="h-44 w-44 rounded-2xl object-cover sm:h-48 sm:w-48"
									/>
									<div>
										<h3 className="font-display text-2xl font-extrabold text-[var(--tl-metallic-black)]">
											{t('management.molinaName')}
										</h3>
										<p className="mt-1 text-sm font-bold tracking-[0.14em] text-[var(--tl-primary)] uppercase">
											{t('management.molinaRole')}
										</p>
										<p className="mt-3 text-sm leading-relaxed text-slate-600">{t('management.molinaBio')}</p>
									</div>
								</div>
							</article>
						</div>
					</div>
				</section>

				<section className="pb-16">
					<div className="mx-auto w-full max-w-[1220px] rounded-3xl border border-[#1f4f9d]/20 bg-[linear-gradient(135deg,#173a7b_0%,#1a3f91_42%,#05070d_100%)] px-6 py-10 text-white shadow-xl shadow-slate-300/35 lg:px-10">
						<h2 className="font-display text-3xl font-extrabold">{t('ctaTitle')}</h2>
						<p className="mt-3 max-w-2xl text-sm text-blue-100 md:text-base">{t('ctaBody')}</p>
						<div className="mt-6 flex flex-wrap gap-3">
							<a
								href="tel:8139323741"
								className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-extrabold text-[var(--tl-primary-strong)]"
							>
								<PhoneCall className="h-4 w-4" />
								{t('contact.phone')}
							</a>
							<a
								href="mailto:anytimelab@24-7labs.com"
								className="inline-flex items-center gap-2 rounded-full border border-white/60 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-white/10"
							>
								<Mail className="h-4 w-4" />
								{t('contact.email')}
							</a>
							<Link
								href="/contact"
								className="inline-flex items-center gap-2 rounded-full border border-white/60 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-white/10"
							>
								{t('contact.contactUs')}
								<ArrowRight className="h-4 w-4" />
							</Link>
						</div>
					</div>
				</section>
			</main>
		</div>
	);
}
