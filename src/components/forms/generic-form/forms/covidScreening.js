import { submitCovidScreeningForm } from '@/lib/api';
import { buildConsentEvidence } from '../consentEvidence';
import { normalizeDateOnly, normalizePhone, safeT } from '../utils';

export function createCovidScreeningConfig(t, shared) {
	const { yesNoOptions, declarationContent, covidTermsContent, sharedPersonal } = shared;

	return {
		layout: 'single',
		description: safeT(t, 'covidScreening.subtitle'),
		submitLabel: safeT(t, 'covidScreening.submitLabel'),
		successMessage: safeT(t, 'covidScreening.successMessage'),
		errorMessage: safeT(t, 'covidScreening.errorMessage'),
		dataNeeds: { countryStates: true },
		sections: [
			{ title: safeT(t, 'common.sections.personalInformation'), fields: sharedPersonal },
			{
				title: safeT(t, 'covidScreening.sections.symptoms'),
				fields: [
					{
						name: 'fever_or_chills',
						type: 'radio',
						label: safeT(t, 'covidScreening.fields.fever'),
						required: true,
						options: yesNoOptions,
					},
					{
						name: 'cough',
						type: 'radio',
						label: safeT(t, 'covidScreening.fields.cough'),
						required: true,
						options: yesNoOptions,
					},
					{
						name: 'difficulty_breathing',
						type: 'radio',
						label: safeT(t, 'covidScreening.fields.breathing'),
						required: true,
						options: yesNoOptions,
					},
					{
						name: 'fatigue',
						type: 'radio',
						label: safeT(t, 'covidScreening.fields.fatigue'),
						required: true,
						options: yesNoOptions,
					},
					{
						name: 'headache',
						type: 'radio',
						label: safeT(t, 'covidScreening.fields.headache'),
						required: true,
						options: yesNoOptions,
					},
					{
						name: 'loss_of_taste_smell',
						type: 'radio',
						label: safeT(t, 'covidScreening.fields.tasteSmell'),
						required: true,
						options: yesNoOptions,
					},
					{
						name: 'sore_throat',
						type: 'radio',
						label: safeT(t, 'covidScreening.fields.soreThroat'),
						required: true,
						options: yesNoOptions,
					},
					{
						name: 'congestion_runny_nose',
						type: 'radio',
						label: safeT(t, 'covidScreening.fields.congestion'),
						required: true,
						options: yesNoOptions,
					},
				],
			},
			{
				title: safeT(t, 'covidScreening.sections.exposureHistory'),
				fields: [
					{
						name: 'covid_exposure',
						type: 'radio',
						label: safeT(t, 'covidScreening.fields.exposure'),
						required: true,
						options: yesNoOptions,
					},
					{
						name: 'vaccination_status',
						type: 'radio',
						label: safeT(t, 'covidScreening.fields.vaccinationStatus'),
						required: true,
						options: [
							{ value: 'not_vaccinated', label: safeT(t, 'common.vaccination.notVaccinated') },
							{ value: 'partially_vaccinated', label: safeT(t, 'common.vaccination.partiallyVaccinated') },
							{ value: 'fully_vaccinated', label: safeT(t, 'common.vaccination.fullyVaccinated') },
							{ value: 'boosted', label: safeT(t, 'common.vaccination.booster') },
						],
					},
					{
						name: 'previous_covid_infection',
						type: 'radio',
						label: safeT(t, 'covidScreening.fields.previousInfection'),
						required: true,
						options: yesNoOptions,
					},
				],
			},
			{
				title: safeT(t, 'common.sections.agreements'),
				fields: [
					{
						name: 'declaration_agreed',
						type: 'agreement',
						label: safeT(t, 'common.declarationTitle'),
						required: true,
						content: declarationContent,
					},
					{
						name: 'terms_agreed',
						type: 'agreement',
						label: safeT(t, 'common.termsTitle'),
						required: true,
						content: covidTermsContent,
					},
					{
						name: 'digital_signature',
						type: 'signature',
						label: safeT(t, 'common.fields.digitalSignature'),
						required: true,
						span: 'full',
					},
				],
			},
		],
		buildPayload: (values, { locale } = {}) => ({
			form_type: 'covid_screening',
			firstname: values.firstname,
			lastname: values.lastname,
			phonenumber: normalizePhone(values.phone),
			dateofbirth: normalizeDateOnly(values.dateofbirth),
			emailaddress: values.email,
			address: values.address,
			city: values.city,
			apt: values.apt,
			zipcode: values.zipcode,
			countrystate: values.state,
			symptoms: {
				fever_or_chills: values.fever_or_chills === 'yes',
				cough: values.cough === 'yes',
				difficulty_breathing: values.difficulty_breathing === 'yes',
				fatigue: values.fatigue === 'yes',
				headache: values.headache === 'yes',
				loss_of_taste_smell: values.loss_of_taste_smell === 'yes',
				sore_throat: values.sore_throat === 'yes',
				congestion_runny_nose: values.congestion_runny_nose === 'yes',
			},
			close_contact_14_days: values.covid_exposure === 'yes',
			tested_positive_before: values.previous_covid_infection === 'yes',
			vaccination_status: values.vaccination_status,
			...buildConsentEvidence(values, locale),
			digital_signature: values.digital_signature,
		}),
		submit: submitCovidScreeningForm,
	};
}
