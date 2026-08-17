'use client';

import { useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { ArrowRight, Clock3, Loader2, Mail, MapPin, PhoneCall } from 'lucide-react';
import FormFieldRenderer from '@/components/forms/generic-form/FormFieldRenderer';
import { buildFormConfig, flattenVisibleFields, initialFieldValues } from '@/components/forms/generic-form/config';
import { fieldConstraintError } from '@/components/forms/generic-form/validationConstraints';
import { appData } from '@/lib/static-data';
import { normalizeDateOnly, safeT } from '@/components/forms/generic-form/utils';

export default function GenericFormPage({ formKey, initialValues = {} }) {
	const t = useTranslations('Forms');
	const locale = useLocale();
	const { states, locations, infections } = appData;
	const [values, setValues] = useState(() => ({
		...initialFieldValues(formKey),
		...initialValues,
	}));
	const [errors, setErrors] = useState({});
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [submitResult, setSubmitResult] = useState({ status: 'idle', message: '' });
	const [validationAttempted, setValidationAttempted] = useState(false);

	const optionSets = useMemo(
		() => ({
			countryStates: states,
			locations,
			infections,
		}),
		[states, locations, infections]
	);

	const config = useMemo(() => buildFormConfig(formKey, t, optionSets), [formKey, optionSets, t]);

	if (!config) {
		return null;
	}

	function setFieldValue(name, value) {
		setValues((previous) => ({ ...previous, [name]: value }));
		setErrors((previous) => ({ ...previous, [name]: '' }));
	}

	function validateForm() {
		const nextErrors = {};
		const fields = flattenVisibleFields(config, values);

		fields.forEach((field) => {
			if (field.type === 'notice') {
				return;
			}

			const value = values[field.name];
			const isStringEmpty = typeof value === 'string' && value.trim() === '';
			const isMissing = value === undefined || value === null || isStringEmpty;

			if (field.required) {
				if (field.type === 'agreement' && value !== true) {
					nextErrors[field.name] = safeT(t, 'common.validation.mustAgree', 'This checkbox is required.');
					return;
				}

				if (isMissing) {
					nextErrors[field.name] = safeT(t, 'common.validation.required', 'This field is required.');
					return;
				}
			}

			const constraintError = fieldConstraintError(field, value);
			if (constraintError) {
				nextErrors[field.name] = safeT(
					t,
					`common.validation.${constraintError.key}`,
					constraintError.fallback,
					constraintError.values
				);
			}

			if (field.validation === 'date' && value && !normalizeDateOnly(value)) {
				nextErrors[field.name] = safeT(t, 'common.validation.invalidDate', 'Please enter a valid date.');
			}
		});

		setErrors(nextErrors);
		return Object.keys(nextErrors).length === 0;
	}

	async function handleSubmit(event) {
		event.preventDefault();
		setSubmitResult({ status: 'idle', message: '' });
		setValidationAttempted(true);

		const isValid = validateForm();
		if (!isValid) {
			return;
		}

		setIsSubmitting(true);
		try {
			const payload = config.buildPayload(values, { locale });
			await config.submit(payload);
			setSubmitResult({ status: 'success', message: config.successMessage });
			setValues(initialFieldValues(formKey));
			setValidationAttempted(false);
		} catch {
			setSubmitResult({ status: 'error', message: config.errorMessage });
		} finally {
			setIsSubmitting(false);
		}
	}

	const title = safeT(t, `${formKey}.title`);
	const aboutTitle = safeT(t, 'common.aboutCard.title');
	const aboutBody = safeT(t, 'common.aboutCard.body');

	return (
		<div className="min-h-screen bg-[linear-gradient(180deg,#f4faff_0%,#ffffff_45%)] text-slate-900">
			<main>
				<section className="mx-auto w-full max-w-[1220px] px-4 pt-12 pb-10 sm:pt-16 lg:px-6">
					<p className="text-sm font-bold tracking-[0.16em] text-[var(--tl-primary)] uppercase">
						{safeT(t, `${formKey}.eyebrow`)}
					</p>
					<h1 className="font-display mt-3 text-3xl leading-tight font-black sm:text-4xl md:text-5xl">{title}</h1>
					<p className="mt-4 max-w-3xl text-base leading-relaxed text-slate-600 md:text-lg">{config.description}</p>
				</section>

				<section
					className={`mx-auto w-full max-w-[1220px] gap-6 overflow-x-hidden px-4 pb-16 lg:px-6 ${
						config.layout === 'split' ? 'grid lg:grid-cols-[0.95fr_1.05fr]' : ''
					}`}
				>
					{config.layout === 'split' ? (
						<aside className="space-y-4 rounded-3xl border border-sky-100 bg-white p-6 shadow-sm">
							<div className="rounded-2xl bg-[#f2f9ff] p-4">
								<p className="text-xs font-bold tracking-[0.14em] text-[var(--tl-primary)] uppercase">{aboutTitle}</p>
								<p className="mt-2 text-sm leading-relaxed text-slate-700">{aboutBody}</p>
							</div>
							<div className="rounded-2xl border border-sky-100 p-4">
								<p className="mt-1 flex items-start gap-2 text-sm font-semibold text-slate-700">
									<MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[var(--tl-primary)]" />
									{safeT(t, 'common.aboutCard.address')}
								</p>
								<p className="mt-3 flex items-start gap-2 text-sm font-semibold text-slate-700">
									<Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--tl-primary)]" />
									{safeT(t, 'common.aboutCard.hours')}
								</p>
								<p className="mt-3 flex items-start gap-2 text-sm font-semibold text-slate-700">
									<PhoneCall className="mt-0.5 h-4 w-4 shrink-0 text-[var(--tl-primary)]" />
									{safeT(t, 'common.aboutCard.phone')}
								</p>
								<p className="mt-3 flex items-start gap-2 text-sm font-semibold text-slate-700">
									<Mail className="mt-0.5 h-4 w-4 shrink-0 text-[var(--tl-primary)]" />
									{safeT(t, 'common.aboutCard.email')}
								</p>
							</div>
							<a
								href="tel:8139323741"
								className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[var(--tl-primary)] px-5 py-3 text-sm font-bold text-white transition hover:bg-[var(--tl-primary-strong)]"
							>
								<PhoneCall className="h-4 w-4" />
								{safeT(t, 'common.callNow', 'Call Now')}
							</a>
						</aside>
					) : null}

					<form
						onSubmit={handleSubmit}
						className={`overflow-hidden rounded-3xl border border-sky-100 bg-white p-6 shadow-sm ${
							config.layout === 'single' ? 'mx-auto max-w-5xl' : ''
						}`}
					>
						{config.sections.map((section, sectionIndex) => (
							<div key={`${formKey}-section-${sectionIndex}`} className={sectionIndex > 0 ? 'mt-8' : ''}>
								<h2 className="font-display text-2xl font-extrabold text-slate-900">{section.title}</h2>
								<div className="mt-4 grid gap-4 md:grid-cols-2">
									{section.fields.map((field) => (
										<FormFieldRenderer
											key={field.name}
											field={field}
											value={values[field.name]}
											fieldError={errors[field.name]}
											values={values}
											t={t}
											onChange={setFieldValue}
										/>
									))}
								</div>
							</div>
						))}

						{validationAttempted && Object.keys(errors).length > 0 ? (
							<p className="mt-5 rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
								{safeT(t, 'common.validation.fixErrors', 'Please fix the errors above before submitting.')}
							</p>
						) : null}

						{submitResult.status !== 'idle' ? (
							<p
								className={`mt-5 rounded-xl px-4 py-3 text-sm font-semibold ${
									submitResult.status === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
								}`}
							>
								{submitResult.message}
							</p>
						) : null}

						<button
							type="submit"
							disabled={isSubmitting}
							className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[var(--tl-primary)] px-6 py-3 text-sm font-bold text-white transition hover:bg-[var(--tl-primary-strong)] disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
						>
							{isSubmitting ? (
								<>
									<Loader2 className="h-4 w-4 animate-spin" />
									{safeT(t, 'common.sending', 'Sending...')}
								</>
							) : (
								<>
									{config.submitLabel}
									<ArrowRight className="h-4 w-4" />
								</>
							)}
						</button>
					</form>
				</section>
			</main>
		</div>
	);
}
