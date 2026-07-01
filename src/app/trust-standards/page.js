import { CheckCircle2, ClipboardCheck, ShieldCheck, Stethoscope } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { generateMetadataFor } from '@/lib/seo';

export const generateMetadata = generateMetadataFor('/trust-standards');

export default async function TrustStandardsPage() {
	const t = await getTranslations('TrustStandardsPage');
	const standards = t.raw('standards');

	return (
		<div className="min-h-screen bg-[linear-gradient(180deg,#f4f9ff_0%,#ffffff_42%)] text-[var(--tl-ink)]">
			<main>
				<section className="mx-auto w-full max-w-[1220px] px-4 pt-12 pb-8 sm:pt-16 lg:px-6">
					<p className="text-sm font-bold tracking-[0.16em] text-[var(--tl-primary)] uppercase">{t('eyebrow')}</p>
					<h1 className="font-display mt-3 max-w-4xl text-3xl leading-tight font-black text-[var(--tl-metallic-black)] sm:text-4xl md:text-5xl">
						{t('title')}
					</h1>
					<p className="mt-5 max-w-3xl text-base leading-relaxed text-slate-600 md:text-lg">{t('body')}</p>

					<div className="mt-8 grid gap-3 sm:grid-cols-3">
						<div className="rounded-2xl border border-[#cfe0fa] bg-white p-4 shadow-sm shadow-[#173469]/10">
							<Stethoscope className="h-5 w-5 text-[var(--tl-primary)]" />
							<p className="mt-2 text-sm font-semibold text-slate-700">{t('badges.clinicalLabQuality')}</p>
						</div>
						<div className="rounded-2xl border border-[#cfe0fa] bg-white p-4 shadow-sm shadow-[#173469]/10">
							<ClipboardCheck className="h-5 w-5 text-[var(--tl-primary)]" />
							<p className="mt-2 text-sm font-semibold text-slate-700">{t('badges.externalReview')}</p>
						</div>
						<div className="rounded-2xl border border-[#cfe0fa] bg-white p-4 shadow-sm shadow-[#173469]/10">
							<ShieldCheck className="h-5 w-5 text-[var(--tl-primary)]" />
							<p className="mt-2 text-sm font-semibold text-slate-700">{t('badges.privacyControls')}</p>
						</div>
					</div>
				</section>

				<section className="mx-auto grid w-full max-w-[1220px] gap-6 px-4 py-4 sm:py-6 lg:px-6">
					{standards.map((standard) => (
						<article
							key={standard.id}
							id={standard.id}
							className="scroll-mt-36 rounded-3xl border border-[#cfe0fa] bg-white p-6 shadow-[0_24px_48px_-40px_rgba(5,7,13,0.9)]"
						>
							<p className="text-xs font-extrabold tracking-[0.18em] text-[var(--tl-primary)] uppercase">
								{standard.short}
							</p>
							<h2 className="font-display mt-2 text-2xl font-extrabold text-[var(--tl-metallic-black)] sm:text-3xl">
								{standard.title}
							</h2>
							<p className="mt-4 max-w-4xl text-sm leading-relaxed text-slate-600 md:text-base">
								{standard.description}
							</p>

							<div className="mt-6 rounded-2xl border border-sky-100 bg-[#f7fbff] p-4">
								<h3 className="font-display text-xl font-bold text-[var(--tl-primary-strong)]">{t('whatItMeans')}</h3>
								<ul className="mt-3 space-y-2.5">
									{standard.points.map((point) => (
										<li key={point} className="flex items-start gap-2.5 text-sm leading-relaxed text-slate-700">
											<CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--tl-primary)]" />
											<span>{point}</span>
										</li>
									))}
								</ul>
							</div>
						</article>
					))}
				</section>
			</main>
		</div>
	);
}
