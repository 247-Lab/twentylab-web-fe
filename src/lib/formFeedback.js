const FIELD_CODES = new Set([
	'invalid',
	'required',
	'invalidEmail',
	'invalidPhone',
	'invalidSignature',
	'invalidDate',
	'mustAgree',
	'outdatedForm',
	'tooLong',
]);
const FIELD_ALIASES = Object.freeze({
	state_name: 'state',
	lab_location_name: 'location',
	symptoms_tests: 'symptoms',
	appointment_datetime: 'datetime',
	infection_name: 'infection',
	close_contact_14_days: 'covid_exposure',
	tested_positive_before: 'previous_covid_infection',
});

export class FormSubmissionError extends Error {
	constructor(kind, reference, fields = []) {
		super('Form submission needs attention');
		this.name = 'FormSubmissionError';
		this.kind = kind;
		this.reference = reference;
		this.fieldErrors = fields
			.filter(
				(item) => typeof item?.field === 'string' && /^[a-z_]{1,50}$/.test(item.field) && FIELD_CODES.has(item.code)
			)
			.slice(0, 40);
	}
}

export function formErrorFields(error, visibleFields, translate) {
	const names = new Set(visibleFields.map((field) => field.name));
	const result = {};
	for (const item of error?.fieldErrors || []) {
		const name = FIELD_ALIASES[item.field] || item.field;
		if (names.has(name)) result[name] = translate(`common.serverValidation.${item.code}`);
	}
	return result;
}

export function formFailureKind(error) {
	if (error?.fieldErrors?.some((item) => item.code === 'outdatedForm')) return 'outdated';
	return ['validation', 'rate_limited', 'too_large', 'rejected'].includes(error?.kind) ? error.kind : 'uncertain';
}
