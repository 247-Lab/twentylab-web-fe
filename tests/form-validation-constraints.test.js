import { describe, expect, it } from 'vitest';
import {
	FORM_FIELD_LIMITS,
	PHONE_DIGIT_LIMITS,
	fieldConstraintError,
	fieldMaxLength,
	isPracticalEmail,
} from '../src/components/forms/generic-form/validationConstraints';

describe('public form validation constraints', () => {
	it('matches the backend field and phone bounds', () => {
		expect(FORM_FIELD_LIMITS).toEqual({
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
		expect(PHONE_DIGIT_LIMITS).toEqual({ min: 10, max: 15 });
		expect(fieldMaxLength('pharmacy_name')).toBe(150);
		expect(fieldMaxLength('currentmedications')).toBe(2000);
	});

	it.each([
		['patient@example.com', true],
		['patient+tag@example.co.uk', true],
		['a@b.c', false],
		['patient@example..com', false],
		['patient@-example.com', false],
		[`${'a'.repeat(245)}@example.com`, false],
	])('applies the practical backend-compatible email contract to %s', (value, expected) => {
		expect(isPracticalEmail(value)).toBe(expected);
	});

	it('rejects phone digit counts outside the backend range', () => {
		const field = { name: 'phone', validation: 'phone', type: 'tel' };
		expect(fieldConstraintError(field, '813-555-0100')).toBeNull();
		expect(fieldConstraintError(field, '123456789')).toMatchObject({ key: 'invalidPhone' });
		expect(fieldConstraintError(field, '1234567890123456')).toMatchObject({ key: 'invalidPhone' });
	});

	it('returns localized-message keys for text and signature limits', () => {
		expect(fieldConstraintError({ name: 'message', type: 'textarea' }, 'x'.repeat(2001))).toMatchObject({
			key: 'tooLong',
			values: { max: 2000 },
		});
		expect(fieldConstraintError({ name: 'digital_signature', type: 'signature' }, 'x'.repeat(100_001))).toMatchObject({
			key: 'signatureTooLarge',
		});
	});
});
