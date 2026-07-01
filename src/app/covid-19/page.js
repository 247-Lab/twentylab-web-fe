import Image from 'next/image';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import {
	ArrowRight,
	CalendarDays,
	Check,
	CircleCheckBig,
	Clock3,
	FlaskConical,
	MapPin,
	ShieldCheck,
} from 'lucide-react';
import { generateMetadataFor } from '@/lib/seo';

export const generateMetadata = generateMetadataFor('/covid-19');

export default async function CovidPage() {
	const t = await getTranslations('CovidPage');

	const symptoms = t.raw('symptoms');
	const reasons = t.raw('reasons');
	const packages = t.raw('packages');
	const steps = t.raw('steps');

	return (
		<div className="min-h-screen bg-[linear-gradient(180deg,#eff7ff_0%,#ffffff_36%)] text-[var(--tl-ink)]">
			<main>
				<section className="mx-auto grid w-full max-w-[1280px] gap-10 px-4 pt-12 pb-12 lg:grid-cols-[1fr_1fr] lg:px-6 lg:pt-16">
					<div className="relative min-h-[300px] lg:min-h-[500px]">
						<Image
							src="/images/cspt-bgshape-150x150.png"
							alt={t('images.shapeAlt')}
							width={150}
							height={150}
							className="pointer-events-none absolute -top-8 -right-3 h-24 w-24 opacity-80 sm:h-32 sm:w-32"
						/>

						<div className="relative mr-2 ml-auto max-w-[580px] overflow-hidden rounded-[2rem] border-[14px] border-[#8C9BA33D] bg-white shadow-[0_24px_55px_-40px_rgba(2,6,14,0.85)]">
							<Image
								src="/images/close-up-doctor-holding-coronavirus-test.jpg"
								alt={t('images.heroAlt')}
								width={940}
								height={760}
								className="h-auto w-full object-cover"
								priority
							/>
						</div>

						<div className="absolute -bottom-10 left-0 hidden w-[50%] max-w-[300px] overflow-hidden rounded-[1.5rem] border-[14px] border-[#8C9BA33D] bg-white shadow-[0_22px_50px_-38px_rgba(2,6,14,0.9)] lg:block">
							<Image
								src="/images/doctor-protective-suit-surgical-face-mask-cotton-swab-from-throat-nose-patient-s-coronavirus-test-test-covid-19-infection-pandemic.jpg"
								alt={t('images.secondaryAlt')}
								width={640}
								height={460}
								className="h-auto w-full object-cover"
							/>
						</div>
					</div>

					<div className="space-y-5 lg:pl-4">
						<p className="inline-flex items-center gap-2 rounded-full border border-[var(--tl-primary)]/30 bg-white px-4 py-2 text-xs font-bold tracking-[0.16em] text-[var(--tl-primary)] uppercase">
							<FlaskConical className="h-4 w-4" />
							{t('eyebrow')}
						</p>

						<h1 className="font-display text-4xl leading-tight font-black text-[var(--tl-metallic-black)] sm:text-5xl">
							{t('title')}
						</h1>

						<p className="text-sm leading-relaxed text-slate-600 sm:text-base">{t('intro1')}</p>
						<p className="text-sm leading-relaxed text-slate-600 sm:text-base">{t('intro2')}</p>

						<div className="grid gap-2 sm:grid-cols-2">
							{symptoms.map((symptom) => (
								<p key={symptom} className="flex items-start gap-2 text-sm text-slate-700">
									<Check className="mt-0.5 h-4 w-4 shrink-0 text-[var(--tl-primary)]" />
									<span>{symptom}</span>
								</p>
							))}
						</div>

						<p className="text-sm leading-relaxed text-slate-600 sm:text-base">{t('accreditation')}</p>

						<Link
							href="/contact"
							className="inline-flex items-center gap-2 rounded-full bg-[var(--tl-primary)] px-5 py-3 text-sm font-bold text-white transition hover:bg-[var(--tl-primary-strong)]"
						>
							{t('bookButton')}
							<ArrowRight className="h-4 w-4" />
						</Link>
					</div>
				</section>

				<section className="mx-auto w-full max-w-[1280px] px-4 py-6 lg:px-6">
					<div className="rounded-[2rem] border-2 border-[var(--tl-primary)]/45 bg-[linear-gradient(145deg,#f3f9ff_0%,#ffffff_100%)] p-6 shadow-[0_22px_55px_-42px_rgba(2,6,14,0.82)] sm:p-8">
						<h2 className="font-display text-center text-3xl font-black text-[var(--tl-metallic-black)]">
							{t('howTitle')}
						</h2>
						<p className="mx-auto mt-4 max-w-4xl text-center text-sm leading-relaxed text-slate-600 sm:text-base">
							{t('howBody')}
						</p>
					</div>
				</section>

				<section className="bg-[#eaf4ff] py-12">
					<div className="mx-auto w-full max-w-[1280px] px-4 lg:px-6">
						<h3 className="font-display text-center text-3xl font-black text-[var(--tl-metallic-black)]">
							{t('pricingTitle')}
						</h3>
						<p className="mx-auto mt-4 max-w-3xl text-center text-sm leading-relaxed text-slate-600 sm:text-base">
							{t('pricingBody')}
						</p>

						<div className="mt-6 grid gap-3 sm:grid-cols-2">
							{reasons.map((reason) => (
								<p key={reason} className="flex items-start gap-2 text-sm font-medium text-slate-700">
									<CircleCheckBig className="mt-0.5 h-4 w-4 shrink-0 text-[var(--tl-primary)]" />
									<span>{reason}</span>
								</p>
							))}
						</div>

						<div className="mt-8 grid gap-5 md:grid-cols-2">
							{packages.map((pkg) => (
								<article
									key={pkg.id}
									className="overflow-hidden rounded-[1.5rem] border-2 border-[var(--tl-primary)]/45 bg-white shadow-[0_18px_42px_-32px_rgba(2,6,14,0.9)]"
								>
									<div className="relative h-64 overflow-hidden">
										<Image
											src="/images/close-up-doctor-holding-coronavirus-test.jpg"
											alt={t('images.packageAlt')}
											fill
											sizes="(max-width: 768px) 100vw, 50vw"
											className="object-cover"
										/>
										<span className="absolute top-4 left-4 rounded-full bg-black/55 px-3 py-1 text-xs font-semibold text-white">
											{t('packageTag')}
										</span>
									</div>
									<div className="space-y-3 bg-[linear-gradient(120deg,#2369be_0%,#0f4a8b_100%)] p-5 text-white">
										<h4 className="font-display text-2xl leading-tight font-black">{pkg.title}</h4>
										<p className="text-2xl font-black">{pkg.price}</p>
										<Link
											href="/contact"
											className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-[var(--tl-primary)] transition hover:bg-slate-100"
										>
											{t('makeAppointment')}
										</Link>
									</div>
								</article>
							))}
						</div>
					</div>
				</section>

				<section className="mx-auto w-full max-w-[1280px] px-4 py-12 lg:px-6">
					<h3 className="font-display text-center text-3xl font-black text-[var(--tl-metallic-black)]">
						{t('stepsTitle')}
					</h3>
					<div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
						{steps.map((step) => {
							const icons = {
								calendar: CalendarDays,
								location: MapPin,
								tested: FlaskConical,
								results: ShieldCheck,
							};
							const Icon = icons[step.icon] || Clock3;

							return (
								<article
									key={step.id}
									className="rounded-[1.5rem] border-2 border-[var(--tl-primary)]/35 bg-white p-5 text-center shadow-[0_16px_38px_-30px_rgba(2,6,14,0.8)]"
								>
									<div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[var(--tl-accent)] text-[var(--tl-primary)]">
										<Icon className="h-7 w-7" />
									</div>
									<h4 className="font-display mt-4 text-xl font-black text-[var(--tl-metallic-black)]">{step.title}</h4>
									<p className="mt-2 text-sm leading-relaxed text-slate-600">{step.description}</p>
								</article>
							);
						})}
					</div>
				</section>

				<section className="bg-[#c6dcf2] py-10">
					<div className="mx-auto w-full max-w-[1280px] px-4 text-center lg:px-6">
						<a
							href="https://www.iatatravelcentre.com/world.php"
							target="_blank"
							rel="noreferrer"
							className="inline-flex items-center gap-2 rounded-full bg-[var(--tl-primary)] px-6 py-3 text-sm font-bold text-white shadow-[0_15px_40px_-28px_rgba(2,6,14,0.85)] transition hover:bg-[var(--tl-primary-strong)]"
						>
							{t('travelMap')}
						</a>
					</div>
				</section>
			</main>
		</div>
	);
}
