import { describe, expect, it } from 'vitest';
import consentManifest from '../config/consent-manifest.json';
import englishForms from '../locales/en/forms.json';
import spanishForms from '../locales/es/forms.json';
import { verifyConsentManifestData } from '../scripts/verify-consent-manifest.mjs';
import { initialFieldValues } from '../src/components/forms/generic-form/initialValues';
import { createSharedFormData } from '../src/components/forms/generic-form/forms/shared';
import { TERMS_VERSION } from '../src/components/forms/generic-form/consentEvidence';
import { createCovidScreeningConfig } from '../src/components/forms/generic-form/forms/covidScreening';
import { createPatientIntakeConfig } from '../src/components/forms/generic-form/forms/patientIntake';
import { createPrescriptionConsentConfig } from '../src/components/forms/generic-form/forms/prescriptionConsent';

const translation = (key) => key;
translation.raw = () => [];

const REQUIRED_EXPLICIT_RESPONSES = {
	patientIntake: ['may_contact_number', 'may_contact_email', 'may_forward_results'],
	covidScreening: [
		'fever_or_chills',
		'cough',
		'difficulty_breathing',
		'fatigue',
		'headache',
		'loss_of_taste_smell',
		'sore_throat',
		'congestion_runny_nose',
		'covid_exposure',
		'vaccination_status',
		'previous_covid_infection',
	],
	prescriptionConsent: ['takinganymedication', 'allergic_to_medication', 'pregnant_or_lactating'],
};

describe('patient consent and health-response contract', () => {
	it('binds the stored terms version to the exact English and Spanish consent text', () => {
		expect(TERMS_VERSION).toBe(consentManifest.activeVersion);
		expect(verifyConsentManifestData(consentManifest, { en: englishForms, es: spanishForms })).toBe(TERMS_VERSION);

		const changedEnglishForms = structuredClone(englishForms);
		changedEnglishForms.Forms.common.termsContent[0] += ' Changed without a new version.';
		expect(() =>
			verifyConsentManifestData(consentManifest, {
				en: changedEnglishForms,
				es: spanishForms,
			})
		).toThrow(/does not match version/);
	});

	it('does not preselect required permissions or medical answers', () => {
		for (const [formKey, fields] of Object.entries(REQUIRED_EXPLICIT_RESPONSES)) {
			const values = initialFieldValues(formKey);
			for (const field of fields) expect(values[field], `${formKey}.${field}`).toBe('');
		}
	});

	it('omits stale conditional medical detail after the answer changes to no', () => {
		const optionSets = { countryStates: ['Florida'], infections: ['Example'] };
		const shared = createSharedFormData(translation, optionSets);
		const config = createPrescriptionConsentConfig(translation, optionSets, shared);
		const payload = config.buildPayload({
			...initialFieldValues('prescriptionConsent'),
			takinganymedication: 'no',
			currentmedications: 'stale medication detail',
			allergic_to_medication: 'no',
			allergies: 'stale allergy detail',
		});

		expect(payload.currentmedications).toBe('');
		expect(payload.allergies).toBe('');
	});

	it('preserves the apartment or unit entered on prescription consent', () => {
		const optionSets = { countryStates: ['Florida'], infections: ['Example'] };
		const shared = createSharedFormData(translation, optionSets);
		const config = createPrescriptionConsentConfig(translation, optionSets, shared);
		const payload = config.buildPayload({
			...initialFieldValues('prescriptionConsent'),
			apt: 'Suite 204',
		});

		expect(payload.apt).toBe('Suite 204');
	});

	it.each([
		['patientIntake', (t, optionSets, shared) => createPatientIntakeConfig(t, shared)],
		['covidScreening', (t, optionSets, shared) => createCovidScreeningConfig(t, shared)],
		['prescriptionConsent', createPrescriptionConsentConfig],
	])('persists explicit, versioned consent evidence for %s', (formKey, createConfig) => {
		expect(TERMS_VERSION).toBe('2026-08-13');
		const optionSets = { countryStates: ['Florida'], infections: ['Example'] };
		const shared = createSharedFormData(translation, optionSets);
		const config = createConfig(translation, optionSets, shared);
		const payload = config.buildPayload(
			{
				...initialFieldValues(formKey),
				declaration_agreed: true,
				terms_agreed: true,
			},
			{ locale: 'es-MX' }
		);

		expect(payload).toMatchObject({
			declaration_agreed: true,
			terms_agreed: true,
			terms_version: '2026-08-13',
			terms_locale: 'es',
		});
	});

	it('does not convert missing consent into affirmative evidence', () => {
		const optionSets = { countryStates: ['Florida'], infections: ['Example'] };
		const shared = createSharedFormData(translation, optionSets);
		const config = createCovidScreeningConfig(translation, shared);
		const payload = config.buildPayload(initialFieldValues('covidScreening'), { locale: 'en' });

		expect(payload).toMatchObject({
			declaration_agreed: false,
			terms_agreed: false,
			terms_version: TERMS_VERSION,
			terms_locale: 'en',
		});
	});
});
