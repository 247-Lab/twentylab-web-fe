import { getLocale, getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { generateMetadataFor } from '@/lib/seo';

export const generateMetadata = generateMetadataFor('/privacy-policy');

export default async function PrivacyPolicyPage() {
	const [locale, t] = await Promise.all([getLocale(), getTranslations('PrivacyPolicyPage')]);
	const sections = t.raw('sections');

	return (
		<main className="bg-white">
			{/* Hero */}
			<section className="relative overflow-hidden bg-gradient-to-br from-[var(--tl-primary)] via-[#0b68c8] to-[#3ca2f5] px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
				<div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_92%_8%,rgba(255,255,255,0.26),transparent_35%)]" />
				<div className="pointer-events-none absolute inset-0 bg-[linear-gradient(165deg,rgba(255,255,255,0.08)_0%,transparent_42%,rgba(8,40,66,0.32)_100%)]" />

				<div className="relative mx-auto max-w-4xl text-center">
					<h1 className="font-display mb-4 text-4xl leading-tight font-bold text-white sm:text-5xl">{t('title')}</h1>
					<p className="text-base text-blue-50 sm:text-lg">
						{locale === 'en'
							? 'Your privacy is important to us. Learn how we collect, use, and protect your personal information.'
							: 'Su privacidad es importante para nosotros. Aprenda cómo recopilamos, usamos y protegemos su información personal.'}
					</p>
					<p className="mt-4 text-sm text-blue-100">{t('lastUpdated')}</p>
				</div>
			</section>

			{/* Quick Links */}
			<div className="bg-slate-50 px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
				<div className="mx-auto max-w-5xl">
					<h2 className="mb-6 text-lg font-semibold text-slate-900">
						{locale === 'en' ? 'Quick Navigation' : 'Navegación Rápida'}
					</h2>
					<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
						{Array.isArray(sections) &&
							sections.map((section, index) => (
								<a
									key={index}
									href={`#section-${index}`}
									className="hover:border-var-tl-primary hover:text-var-tl-primary rounded-lg border border-slate-200 bg-white p-3 text-left text-sm font-medium text-slate-700 transition-all hover:bg-blue-50"
								>
									{section.title}
								</a>
							))}
					</div>
				</div>
			</div>

			{/* Intro Section */}
			<section className="px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
				<div className="mx-auto max-w-4xl">
					<div className="rounded-[1.5rem] border border-slate-200 bg-gradient-to-br from-blue-50 to-white p-8 sm:p-10">
						<p className="text-base leading-relaxed text-slate-700 sm:text-lg">{t('intro')}</p>
					</div>
				</div>
			</section>

			{/* Sections */}
			<section className="px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
				<div className="mx-auto max-w-4xl">
					<div className="space-y-4">
						{Array.isArray(sections) &&
							sections.map((section, index) => (
								<div
									key={index}
									id={`section-${index}`}
									className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white transition-all duration-300 hover:shadow-md"
								>
									<div className="p-6 sm:p-7">
										<h2 className="font-display text-xl font-bold text-slate-900 sm:text-2xl">{section.title}</h2>
										<p className="mt-4 text-base leading-relaxed whitespace-pre-line text-slate-700 sm:text-lg">
											{section.content}
										</p>
									</div>
								</div>
							))}
					</div>
				</div>
			</section>

			{/* Additional Info */}
			<section className="bg-slate-50 px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
				<div className="mx-auto max-w-4xl">
					<h2 className="font-display mb-8 text-3xl font-bold text-slate-900">
						{locale === 'en' ? 'Important Information' : 'Información Importante'}
					</h2>

					<div className="grid grid-cols-1 gap-6 md:grid-cols-2">
						<div className="rounded-[1.5rem] border border-slate-200 bg-white p-8">
							<h3 className="mb-4 text-lg font-semibold text-slate-900">
								{locale === 'en' ? 'Age Requirement' : 'Requisito de Edad'}
							</h3>
							<p className="text-sm leading-relaxed text-slate-700">
								{locale === 'en'
									? 'Our Services are available only to users who are 18 years of age or older. We do not knowingly collect information from individuals under 18 years old.'
									: 'Nuestros Servicios están disponibles solo para usuarios de 18 años o más. No recopilamos información de individuos menores de 18 años.'}
							</p>
						</div>

						<div className="rounded-[1.5rem] border border-slate-200 bg-white p-8">
							<h3 className="mb-4 text-lg font-semibold text-slate-900">
								{locale === 'en' ? 'Changes to Policy' : 'Cambios en la Política'}
							</h3>
							<p className="text-sm leading-relaxed text-slate-700">
								{locale === 'en'
									? 'We may modify this Privacy Policy at any time. Changes become effective immediately upon posting.'
									: 'Podemos modificar esta Política de Privacidad en cualquier momento. Los cambios entran en vigencia inmediatamente.'}
							</p>
						</div>

						<div className="rounded-[1.5rem] border border-slate-200 bg-white p-8">
							<h3 className="mb-4 text-lg font-semibold text-slate-900">
								{locale === 'en' ? 'Opt-Out Options' : 'Opciones de Exclusión'}
							</h3>
							<p className="text-sm leading-relaxed text-slate-700">
								{locale === 'en'
									? 'You can control cookies through your browser settings, manage your account preferences, or contact us to opt-out.'
									: 'Puede controlar las cookies a través de la configuración del navegador o contactarnos para optar por no participar.'}
							</p>
						</div>

						<div className="rounded-[1.5rem] border border-slate-200 bg-white p-8">
							<h3 className="mb-4 text-lg font-semibold text-slate-900">
								{locale === 'en' ? 'HIPAA Compliance' : 'Cumplimiento HIPAA'}
							</h3>
							<p className="text-sm leading-relaxed text-slate-700">
								{locale === 'en'
									? 'We comply with HIPAA/HITECH regulations for handling Protected Health Information with appropriate security measures.'
									: 'Cumplimos con las regulaciones HIPAA/HITECH para el manejo de información sanitaria protegida.'}
							</p>
						</div>
					</div>
				</div>
			</section>

			{/* Contact Section */}
			<section className="relative overflow-hidden bg-[linear-gradient(135deg,#ffffff_0%,#f4f9ff_100%)] px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
				<div className="relative mx-auto max-w-4xl text-center">
					<h2 className="font-display mb-4 text-3xl font-bold text-[var(--tl-metallic-black)] sm:text-4xl">
						{locale === 'en' ? 'Questions About Your Privacy?' : '¿Preguntas sobre su privacidad?'}
					</h2>
					<p className="mb-8 text-base text-slate-700 sm:text-lg">
						{locale === 'en'
							? 'If you have any questions or concerns about this Privacy Policy, please contact us.'
							: 'Si tiene preguntas o inquietudes sobre esta Política de Privacidad, contáctenos.'}
					</p>

					<div className="mb-8 rounded-[1.5rem] border border-sky-200 bg-white p-8 shadow-sm">
						<div className="grid grid-cols-1 gap-6 text-slate-900 md:grid-cols-3">
							<div>
								<p className="mb-2 text-sm text-slate-600">{locale === 'en' ? 'Email' : 'Correo Electrónico'}</p>
								<a
									href={`mailto:${t('contactInfo.email')}`}
									className="text-base font-semibold transition-colors hover:text-[var(--tl-primary)]"
								>
									{t('contactInfo.email')}
								</a>
							</div>
							<div>
								<p className="mb-2 text-sm text-slate-600">{locale === 'en' ? 'Phone' : 'Teléfono'}</p>
								<a
									href={`tel:${t('contactInfo.phone').replace(/\s+/g, '')}`}
									className="text-base font-semibold transition-colors hover:text-[var(--tl-primary)]"
								>
									{t('contactInfo.phone')}
								</a>
							</div>
							<div>
								<p className="mb-2 text-sm text-slate-600">{locale === 'en' ? 'Address' : 'Dirección'}</p>
								<a
									href="https://maps.app.goo.gl/jYLTRTk3D1wxUWHd6"
									target="_blank"
									rel="noreferrer"
									className="text-base font-semibold transition-colors hover:text-[var(--tl-primary)]"
								>
									{t('contactInfo.address')}
								</a>
							</div>
						</div>
					</div>

					<div className="flex flex-col justify-center gap-3 sm:flex-row sm:gap-4">
						<a
							href={`mailto:${t('contactInfo.email')}`}
							className="inline-flex items-center justify-center rounded-lg bg-[var(--tl-primary)] px-8 py-3 font-semibold text-white transition-all duration-200 hover:bg-[var(--tl-primary-strong)] hover:shadow-lg"
						>
							{locale === 'en' ? 'Send Email' : 'Enviar Correo'}
						</a>
						<Link
							href="tel:+18139323741"
							className="inline-flex items-center justify-center rounded-lg border-2 border-sky-200 px-8 py-3 font-semibold text-[var(--tl-primary-strong)] transition-all duration-200 hover:border-[var(--tl-primary)] hover:text-[var(--tl-primary)]"
						>
							{locale === 'en' ? 'Call 813-932-3741' : 'Llamar 813-932-3741'}
						</Link>
					</div>
				</div>
			</section>
		</main>
	);
}
