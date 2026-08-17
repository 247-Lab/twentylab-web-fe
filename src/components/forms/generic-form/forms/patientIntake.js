import { submitPatientIntakeForm } from '@/lib/api';
import { buildConsentEvidence } from '../consentEvidence';
import { normalizeDateOnly, normalizePhone, safeT } from '../utils';

export function createPatientIntakeConfig(t, shared) {
	const { yesNoOptions, declarationContent, termsContent, sharedPersonal } = shared;

	return {
		layout: 'single',
		description: safeT(t, 'patientIntake.subtitle'),
		submitLabel: safeT(t, 'patientIntake.submitLabel'),
		successMessage: safeT(t, 'patientIntake.successMessage'),
		errorMessage: safeT(t, 'patientIntake.errorMessage'),
		dataNeeds: { countryStates: true },
		sections: [
			{ title: safeT(t, 'common.sections.personalInformation'), fields: sharedPersonal },
			{
				title: safeT(t, 'patientIntake.sections.permissions'),
				fields: [
					{
						name: 'may_contact_number',
						type: 'radio',
						label: safeT(t, 'patientIntake.fields.mayContactNumber'),
						required: true,
						options: yesNoOptions,
					},
					{
						name: 'may_contact_email',
						type: 'radio',
						label: safeT(t, 'patientIntake.fields.mayContactEmail'),
						required: true,
						options: yesNoOptions,
					},
					{
						name: 'may_forward_results',
						type: 'radio',
						label: safeT(t, 'patientIntake.fields.mayForwardResults'),
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
		],
		buildPayload: (values, { locale } = {}) => ({
			form_type: 'patient_intake',
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
			may_contact_number: values.may_contact_number === 'yes',
			may_contact_email: values.may_contact_email === 'yes',
			may_forward_results: values.may_forward_results === 'yes',
			self_declaration: values.declaration_agreed === true && values.terms_agreed === true,
			...buildConsentEvidence(values, locale),
			digital_signature: values.digital_signature,
		}),
		submit: submitPatientIntakeForm,
	};
}
