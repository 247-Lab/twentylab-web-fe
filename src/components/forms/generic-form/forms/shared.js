import { safeRaw, safeT } from '../utils';

export function createSharedFormData(t, optionSets) {
	const yesNoOptions = [
		{ value: 'yes', label: safeT(t, 'common.yes', 'Yes') },
		{ value: 'no', label: safeT(t, 'common.no', 'No') },
	];

	const declarationContent = safeRaw(t, 'common.declarationContent', []);
	const termsContent = safeRaw(t, 'common.termsContent', []);
	const covidTermsContent = safeRaw(t, 'common.covidTermsContent', termsContent);
	const medicationPricingLines = safeRaw(t, 'common.medicationPricing.lines', []);

	const sharedPersonal = [
		{ name: 'firstname', type: 'text', label: safeT(t, 'common.fields.firstName', 'First Name'), required: true },
		{ name: 'lastname', type: 'text', label: safeT(t, 'common.fields.lastName', 'Last Name'), required: true },
		{
			name: 'phone',
			type: 'tel',
			label: safeT(t, 'common.fields.phone', 'Phone Number'),
			required: true,
			validation: 'phone',
		},
		{
			name: 'dateofbirth',
			type: 'date',
			label: safeT(t, 'common.fields.dateOfBirth', 'Date of Birth'),
			required: true,
			validation: 'date',
		},
		{
			name: 'email',
			type: 'email',
			label: safeT(t, 'common.fields.email', 'Email'),
			required: true,
			validation: 'email',
		},
		{ name: 'address', type: 'text', label: safeT(t, 'common.fields.address', 'Address'), required: true },
		{ name: 'city', type: 'text', label: safeT(t, 'common.fields.city', 'City'), required: true },
		{ name: 'apt', type: 'text', label: safeT(t, 'common.fields.apt', 'Apt') },
		{ name: 'zipcode', type: 'text', label: safeT(t, 'common.fields.zipCode', 'Zip Code'), required: true },
		{
			name: 'state',
			type: 'select',
			label: safeT(t, 'common.fields.state', 'State'),
			required: true,
			placeholder: safeT(t, 'common.selectState', 'Select State'),
			options: optionSets.countryStates.map((state) => ({ value: state, label: state })),
		},
	];

	return {
		yesNoOptions,
		declarationContent,
		termsContent,
		covidTermsContent,
		medicationPricingLines,
		sharedPersonal,
	};
}
