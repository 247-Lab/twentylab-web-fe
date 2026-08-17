export const FORM_FIELD_LIMITS = Object.freeze({
	firstname: 150,
	lastname: 150,
	email: 254,
	phone: 40,
	message: 2000,
	location: 500,
	symptoms: 2000,
	address: 500,
	city: 150,
	apt: 150,
	zipcode: 20,
	state: 150,
	infection: 150,
	currentmedications: 2000,
	allergies: 2000,
	pharmacy_name: 150,
	pharmacy_phonenumber: 40,
	digital_signature: 100_000,
});

export const PHONE_DIGIT_LIMITS = Object.freeze({ min: 10, max: 15 });

export function fieldMaxLength(fieldName) {
	return FORM_FIELD_LIMITS[fieldName];
}

export function isPracticalEmail(value) {
	const email = String(value || '');
	if (!email || email.length > FORM_FIELD_LIMITS.email || /\s/.test(email)) return false;

	const parts = email.split('@');
	if (parts.length !== 2) return false;
	const [local, domain] = parts;
	if (!local || local.length > 64 || !domain || domain.length > 253) return false;
	if (local.startsWith('.') || local.endsWith('.') || local.includes('..')) return false;
	if (!/^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+$/.test(local)) return false;

	const labels = domain.split('.');
	if (labels.length < 2 || labels.some((label) => !/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?$/.test(label))) {
		return false;
	}
	return /^[A-Za-z]{2,63}$/.test(labels.at(-1));
}

export function fieldConstraintError(field, value) {
	if (typeof value !== 'string' || value.length === 0) return null;

	const maxLength = fieldMaxLength(field.name);
	if (maxLength && value.length > maxLength) {
		return field.type === 'signature'
			? {
					key: 'signatureTooLarge',
					fallback: 'The signature is too large. Clear it and sign again.',
				}
			: {
					key: 'tooLong',
					fallback: `Use ${maxLength} characters or fewer.`,
					values: { max: maxLength },
				};
	}

	if (field.validation === 'email' && !isPracticalEmail(value)) {
		return { key: 'invalidEmail', fallback: 'Please enter a valid email address.' };
	}

	if (field.validation === 'phone') {
		const digitCount = value.replace(/\D/g, '').length;
		if (digitCount < PHONE_DIGIT_LIMITS.min || digitCount > PHONE_DIGIT_LIMITS.max) {
			return {
				key: 'invalidPhone',
				fallback: 'Please enter a phone number with 10 to 15 digits.',
			};
		}
	}

	return null;
}
