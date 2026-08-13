import { submitPrescriptionConsentForm } from '@/lib/api';
import { buildConsentEvidence } from '../consentEvidence';
import { normalizeDateOnly, normalizePhone, safeT } from '../utils';

export function createPrescriptionConsentConfig(t, optionSets, shared) {
	const { yesNoOptions, declarationContent, termsContent, medicationPricingLines, sharedPersonal } = shared;

	return {
		layout: 'single',
		description: safeT(t, 'prescriptionConsent.subtitle'),
		submitLabel: safeT(t, 'prescriptionConsent.submitLabel'),
		successMessage: safeT(t, 'prescriptionConsent.successMessage'),
		errorMessage: safeT(t, 'prescriptionConsent.errorMessage'),
		dataNeeds: { countryStates: true, infections: true },
		sections: [
			{
				title: safeT(t, 'common.sections.personalInformation'),
				fields: [
					...sharedPersonal,
					{
						name: 'infection',
						type: 'select',
						label: safeT(t, 'prescriptionConsent.fields.infection'),
						required: true,
						placeholder: safeT(t, 'prescriptionConsent.selectInfection', 'Select Infection'),
						span: 'full',
						options: optionSets.infections.map((infection) => ({
							value: infection,
							label: infection,
						})),
					},
				],
			},
			{
				title: safeT(t, 'prescriptionConsent.sections.medicalQuestions'),
				fields: [
					{
						name: 'takinganymedication',
						type: 'radio',
						label: safeT(t, 'prescriptionConsent.fields.currentMedication'),
						required: true,
						options: yesNoOptions,
					},
					{
						name: 'currentmedications',
						type: 'textarea',
						label: safeT(t, 'prescriptionConsent.fields.currentMedicationDetails'),
						required: true,
						rows: 3,
						span: 'full',
						showWhen: (values) => values.takinganymedication === 'yes',
					},
					{
						name: 'allergic_to_medication',
						type: 'radio',
						label: safeT(t, 'prescriptionConsent.fields.allergicMedication'),
						required: true,
						options: yesNoOptions,
					},
					{
						name: 'allergies',
						type: 'textarea',
						label: safeT(t, 'prescriptionConsent.fields.allergiesDetails'),
						required: true,
						rows: 3,
						span: 'full',
						showWhen: (values) => values.allergic_to_medication === 'yes',
					},
					{
						name: 'pregnant_or_lactating',
						type: 'radio',
						label: safeT(t, 'prescriptionConsent.fields.pregnant'),
						required: true,
						options: yesNoOptions,
					},
					{
						name: 'pharmacy_name',
						type: 'text',
						label: safeT(t, 'prescriptionConsent.fields.pharmacyName'),
						required: true,
					},
					{
						name: 'pharmacy_phonenumber',
						type: 'tel',
						label: safeT(t, 'prescriptionConsent.fields.pharmacyPhone'),
						required: true,
						validation: 'phone',
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
						content: termsContent,
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
			{
				title: safeT(t, 'common.noticeTitle'),
				fields: [
					{
						name: 'medicationNotice',
						type: 'notice',
						noticeTitle: safeT(t, 'common.medicationPricing.title'),
						noticeLines: medicationPricingLines,
					},
				],
			},
		],
		buildPayload: (values, { locale } = {}) => ({
			form_type: 'consent',
			firstname: values.firstname,
			lastname: values.lastname,
			phonenumber: normalizePhone(values.phone),
			dateofbirth: normalizeDateOnly(values.dateofbirth),
			emailaddress: values.email,
			address: values.address,
			apt: values.apt,
			zipcode: values.zipcode,
			city: values.city,
			countrystate: values.state,
			infection: values.infection,
			takinganymedication: values.takinganymedication === 'yes',
			currentmedications: values.takinganymedication === 'yes' ? values.currentmedications : '',
			allergic_to_medication: values.allergic_to_medication === 'yes',
			allergies: values.allergic_to_medication === 'yes' ? values.allergies : '',
			pregnant_or_lactating: values.pregnant_or_lactating === 'yes',
			pharmacy_name: values.pharmacy_name,
			pharmacy_phonenumber: normalizePhone(values.pharmacy_phonenumber),
			...buildConsentEvidence(values, locale),
			digital_signature: values.digital_signature,
		}),
		submit: submitPrescriptionConsentForm,
	};
}
