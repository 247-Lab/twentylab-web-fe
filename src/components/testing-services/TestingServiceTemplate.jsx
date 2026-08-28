import Image from 'next/image';
import Link from 'next/link';

function normalizeHeroDescriptionLines(lines) {
	if (!Array.isArray(lines)) {
		return [];
	}

	return lines
		.map((line) => (typeof line === 'string' ? line.trim() : ''))
		.filter(Boolean)
		.slice(0, 2)
		.map((line) => (line.length > 190 ? `${line.slice(0, 187).trimEnd()}...` : line));
}

const heroCtaMap = {
	DnaTestingPage: {
		primaryLabel: 'Schedule DNA Testing',
		secondaryLabel: 'Call 813-932-3741',
	},
	StdTestingPage: {
		primaryLabel: 'Schedule STD Testing',
		secondaryLabel: 'Call 813-932-3741',
	},
	DrugTestingPage: {
		primaryLabel: 'Schedule Drug Testing',
		secondaryLabel: 'Call 813-932-3741',
	},
	AllergyTestingPage: {
		primaryLabel: 'Schedule Allergy Testing',
		secondaryLabel: 'Call 813-932-3741',
	},
	HeartTestingPage: {
		primaryLabel: 'Schedule Heart Testing',
		secondaryLabel: 'Call 813-932-3741',
	},
	HormoneTestingPage: {
		primaryLabel: 'Schedule Hormone Testing',
		secondaryLabel: 'Call 813-932-3741',
	},
	RoutineHealthTestingPage: {
		primaryLabel: 'Schedule Health Testing',
		secondaryLabel: 'Call 813-932-3741',
	},
};

const heroImageMap = {
	DnaTestingPage: {
		large: '/images/pexels-rodnae-productions-6129507-1024x683-1-600x400.jpg',
		small: '/images/closeup-man-having-pcr-test-medical-clinic.jpg',
	},
	StdTestingPage: {
		large: '/images/img-02-1-1024x683-1-600x400.jpg',
		small:
			'/images/doctor-protective-suit-surgical-face-mask-cotton-swab-from-throat-nose-patient-s-coronavirus-test-test-covid-19-infection-pandemic.jpg',
	},
	DrugTestingPage: {
		large: '/images/drug-test.jpg',
		small: '/images/lab4-300x200.jpg',
	},
	AllergyTestingPage: {
		large: '/images/waiting-room.jpg',
		small: '/images/labtory.jpg',
	},
	HeartTestingPage: {
		large: '/images/labtory.jpg',
		small: '/images/lab4-300x200.jpg',
	},
	HormoneTestingPage: {
		large: '/images/pexels-rodnae-productions-6129507-1024x683-1-600x400.jpg',
		small: '/images/closeup-man-having-pcr-test-medical-clinic.jpg',
	},
	RoutineHealthTestingPage: {
		large: '/images/bio-service-4.jpg',
		small: '/images/labtory.jpg',
	},
};

export function TestingServiceHero({ t, pageKey, heroImages }) {
	const resolvedHeroImages = heroImages || heroImageMap[pageKey];
	const descriptionRaw = t.raw(`${pageKey}.hero.description`);
	const descriptionLines = normalizeHeroDescriptionLines(
		Array.isArray(descriptionRaw) ? descriptionRaw : [descriptionRaw]
	);
	const heroTitle = t(`${pageKey}.hero.title`);
	const heroCta = heroCtaMap[pageKey] || {
		primaryLabel: 'Schedule Appointment',
		secondaryLabel: 'Call 813-932-3741',
	};
	const hasMainTitle = typeof t.has === 'function' ? t.has(`${pageKey}.hero.mainTitle`) : false;

	return (
		<section className="relative overflow-hidden bg-gradient-to-br from-[var(--tl-primary)] via-[#0b68c8] to-[#3ca2f5] px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
			<div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_92%_8%,rgba(255,255,255,0.26),transparent_35%)]" />
			<div className="pointer-events-none absolute inset-0 bg-[linear-gradient(165deg,rgba(255,255,255,0.08)_0%,transparent_42%,rgba(8,40,66,0.32)_100%)]" />
			<div className="relative mx-auto grid max-w-6xl grid-cols-1 items-center gap-8 md:grid-cols-2 md:gap-12">
				{resolvedHeroImages ? (
					<div className="relative mx-auto w-full max-w-md pb-14">
						<Image
							src="/images/cspt-bgshape-150x150.png"
							alt=""
							width={150}
							height={150}
							className="absolute -top-8 -right-4 z-0 h-20 w-20 opacity-80 sm:h-24 sm:w-24"
						/>
						<div className="relative z-10 overflow-hidden rounded-[1.75rem] border-[12px] border-white/25 bg-white/10 shadow-2xl sm:border-[16px]">
							<Image
								src={resolvedHeroImages.large}
								alt={t(`${pageKey}.hero.title`)}
								width={800}
								height={540}
								className="h-[250px] w-full object-cover sm:h-[320px] md:h-[350px]"
							/>
						</div>
						<div className="absolute bottom-0 left-0 z-20 w-[48%] overflow-hidden rounded-2xl border-8 border-white/25 bg-white/10 shadow-xl sm:border-[10px]">
							<Image
								src={resolvedHeroImages.small}
								alt={t(`${pageKey}.hero.overline`)}
								width={420}
								height={280}
								className="h-[120px] w-full object-cover sm:h-[145px]"
							/>
						</div>
					</div>
				) : null}

				<div className="rounded-[1.75rem] border border-white/28 bg-white/14 p-6 shadow-[0_24px_60px_-36px_rgba(5,7,13,0.92)] backdrop-blur-sm sm:p-8">
					<div className="mb-6 flex flex-col gap-2">
						<span className="inline-flex w-fit rounded-full border border-white/30 bg-white/12 px-3 py-1.5 text-sm font-semibold tracking-[0.12em] text-white sm:text-base">
							{t(`${pageKey}.hero.overline`)}
						</span>
						{hasMainTitle ? (
							<p className="text-sm font-semibold text-sky-100 sm:text-base">{t(`${pageKey}.hero.mainTitle`)}</p>
						) : null}
						<h1 className="font-display text-3xl leading-tight font-extrabold text-white sm:text-4xl lg:text-5xl">
							{heroTitle}
						</h1>
					</div>
					<div className="space-y-4 text-white/90">
						{descriptionLines.map((desc, idx) => (
							<p key={idx} className="max-w-2xl text-sm leading-relaxed sm:text-base">
								{desc}
							</p>
						))}
					</div>

					<div className="mt-6 flex flex-wrap gap-2.5">
						<span className="inline-flex items-center rounded-full border border-white/35 bg-white/12 px-3 py-1 text-xs font-bold tracking-[0.08em] text-white/95 uppercase">
							{t('LocalizationCommon.cliaCertified')}
						</span>
						<span className="inline-flex items-center rounded-full border border-white/35 bg-white/12 px-3 py-1 text-xs font-bold tracking-[0.08em] text-white/95 uppercase">
							{t('LocalizationCommon.capAccredited')}
						</span>
						<span className="inline-flex items-center rounded-full border border-white/35 bg-white/12 px-3 py-1 text-xs font-bold tracking-[0.08em] text-white/95 uppercase">
							{t('LocalizationCommon.resultsIn1To3Days')}
						</span>
					</div>

					<div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
						<Link
							href="/schedule-appointment"
							className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-extrabold tracking-wide text-[var(--tl-primary-strong)] uppercase transition hover:-translate-y-0.5 hover:bg-sky-50 hover:shadow-lg"
						>
							{heroCta.primaryLabel}
						</Link>
						<a
							href="tel:8139323741"
							className="inline-flex items-center justify-center rounded-full border border-white/45 bg-transparent px-6 py-3 text-sm font-bold tracking-wide text-white uppercase transition hover:-translate-y-0.5 hover:bg-white/12"
						>
							{heroCta.secondaryLabel}
						</a>
					</div>
				</div>
			</div>
		</section>
	);
}

export function TestingServiceHowItWorks({ t, pageKey }) {
	const stepsRaw = t.raw(`${pageKey}.howItWorks.steps`);
	const steps = Array.isArray(stepsRaw) ? stepsRaw : [];

	return (
		<section className="bg-[linear-gradient(180deg,#f5f8ff_0%,#ffffff_100%)] px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
			<div className="mx-auto max-w-6xl">
				<div className="mb-12">
					<h2 className="font-display mb-4 text-3xl font-bold text-slate-900 sm:text-4xl">
						{t(`${pageKey}.howItWorks.title`)}
					</h2>
					<p className="text-base leading-relaxed text-slate-700 sm:text-lg">{t(`${pageKey}.howItWorks.intro`)}</p>
				</div>

				<div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
					{steps.map((step, index) => (
						<div
							key={index}
							className="group relative overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
						>
							<div className="pointer-events-none absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-[var(--tl-primary)] to-[var(--tl-primary-strong)]" />
							<div className="font-display mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[rgba(38,127,199,0.12)] text-lg font-bold text-[var(--tl-primary)]">
								{index + 1}
							</div>
							<h3 className="mb-3 text-xl font-semibold text-slate-900">{step.title}</h3>
							<p className="text-base leading-relaxed text-slate-700">{step.description}</p>
						</div>
					))}
				</div>
			</div>
		</section>
	);
}

export function TestingServiceItems({ t, pageKey, sectionKey, itemsKey }) {
	const itemsRaw = t.raw(`${pageKey}.${sectionKey}.${itemsKey}`);
	const items = Array.isArray(itemsRaw) ? itemsRaw : [];
	const title = t(`${pageKey}.${sectionKey}.title`);
	const intro = t(`${pageKey}.${sectionKey}.intro`);

	return (
		<section className="px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
			<div className="mx-auto max-w-6xl">
				<div className="mb-12">
					<h2 className="font-display mb-4 text-3xl font-bold text-slate-900 sm:text-4xl">{title}</h2>
					<p className="text-base leading-relaxed text-slate-700 sm:text-lg">{intro}</p>
				</div>

				<div className="grid grid-cols-1 gap-6 md:grid-cols-2">
					{items.map((item, index) => (
						<div
							key={index}
							className="group rounded-[1.75rem] border border-slate-200 bg-white p-8 transition-all duration-300 hover:-translate-y-1 hover:border-[var(--tl-primary-soft)] hover:shadow-xl"
						>
							<div className="mb-4 inline-flex rounded-full bg-[var(--tl-primary)] px-3 py-1 text-xs font-bold tracking-[0.08em] text-white uppercase">
								{t('LocalizationCommon.option')} {index + 1}
							</div>
							<h3 className="mb-3 text-xl font-semibold text-slate-900 sm:text-2xl">{item.name || item.title}</h3>
							<p className="text-base leading-relaxed text-slate-700">{item.description}</p>

							{item.tests && (
								<div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
									<p className="mb-3 text-sm font-semibold text-slate-900">{t('LocalizationCommon.includes')}</p>
									<ul className="space-y-2">
										{item.tests.map((test, idx) => (
											<li key={idx} className="flex items-start gap-2 text-sm text-slate-700">
												<span className="mt-1 text-[var(--tl-primary)]">✓</span>
												{test}
											</li>
										))}
									</ul>
								</div>
							)}
						</div>
					))}
				</div>
			</div>
		</section>
	);
}

export function TestingServiceList({ t, pageKey, sectionKey, itemsKey }) {
	const itemsRaw = t.raw(`${pageKey}.${sectionKey}.${itemsKey}`);
	const items = Array.isArray(itemsRaw) ? itemsRaw : [];
	const title = t(`${pageKey}.${sectionKey}.title`);
	const intro = t(`${pageKey}.${sectionKey}.intro`);

	return (
		<section className="bg-[linear-gradient(180deg,#f5f8ff_0%,#ffffff_100%)] px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
			<div className="mx-auto max-w-6xl">
				<div className="mb-12">
					<h2 className="font-display mb-4 text-3xl font-bold text-slate-900 sm:text-4xl">{title}</h2>
					<p className="text-base leading-relaxed text-slate-700 sm:text-lg">{intro}</p>
				</div>

				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
					{items.map((item, index) => (
						<div
							key={index}
							className="rounded-xl border border-slate-200 bg-white p-6 transition-all duration-200 hover:border-[var(--tl-primary-soft)] hover:shadow-md"
						>
							<div className="mb-3 h-1.5 w-14 rounded-full bg-gradient-to-r from-[var(--tl-primary)] to-[var(--tl-primary-strong)]" />
							<p className="text-base font-semibold text-slate-900 sm:text-lg">{item}</p>
						</div>
					))}
				</div>
			</div>
		</section>
	);
}

export function TestingServiceFinalCta({ title, description, buttonText, buttonHref = '/schedule-appointment' }) {
	return (
		<section className="px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
			<div className="relative mx-auto max-w-6xl overflow-hidden rounded-[2rem] bg-gradient-to-r from-[var(--tl-primary)] via-[var(--tl-primary-strong)] to-[var(--tl-metallic-black)] p-8 shadow-[0_30px_60px_-36px_rgba(5,7,13,0.85)] sm:p-10 lg:p-12">
				<div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_12%,rgba(255,255,255,0.3),transparent_34%)]" />
				<div className="relative grid grid-cols-1 items-center gap-6 md:grid-cols-[1fr_auto]">
					<div>
						<h2 className="font-display text-3xl font-bold text-white sm:text-4xl">{title}</h2>
						<p className="mt-3 max-w-3xl text-base leading-relaxed text-white/90 sm:text-lg">{description}</p>
					</div>
					<a
						href={buttonHref}
						className="inline-flex items-center justify-center rounded-full bg-white px-8 py-3 text-sm font-extrabold tracking-[0.08em] text-[var(--tl-primary-strong)] uppercase transition hover:-translate-y-0.5 hover:bg-sky-50 hover:shadow-lg"
					>
						{buttonText}
					</a>
				</div>
			</div>
		</section>
	);
}
