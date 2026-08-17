import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { normalizeLocale } from '../src/lib/locale';
import { isEmail, normalizeDateOnly, normalizePhone } from '../src/components/forms/generic-form/utils';

const englishForms = JSON.parse(await readFile(new URL('../locales/en/forms.json', import.meta.url), 'utf8'));
const spanishForms = JSON.parse(await readFile(new URL('../locales/es/forms.json', import.meta.url), 'utf8'));

describe('locale and form helpers', () => {
	it('normalizes supported locales and safely falls back to English', () => {
		expect(normalizeLocale('es-MX')).toBe('es');
		expect(normalizeLocale('fr-FR')).toBe('en');
		expect(normalizeLocale(undefined)).toBe('en');
	});

	it('normalizes and validates public form values', () => {
		expect(isEmail('patient@example.com')).toBe(true);
		expect(isEmail('patient@example..com')).toBe(false);
		expect(isEmail('a@b.c')).toBe(false);
		expect(isEmail('not-an-email')).toBe(false);
		expect(normalizePhone('(813) 555-0123')).toBe('8135550123');
		expect(normalizeDateOnly('2026-08-13')).toBe('2026-08-13');
		expect(normalizeDateOnly('2026-02-29')).toBeNull();
		expect(normalizeDateOnly('not-a-date')).toBeNull();
	});

	it('describes appointment submissions as requests awaiting confirmation in both locales', () => {
		const english = englishForms.Forms.scheduleAppointment.successMessage;
		const spanish = spanishForms.Forms.scheduleAppointment.successMessage;

		expect(english).toContain('request received');
		expect(english).toContain('confirm availability');
		expect(english).not.toContain('scheduled successfully');
		expect(spanish).toContain('Solicitud de cita recibida');
		expect(spanish).toContain('confirmar la disponibilidad');
		expect(spanish).not.toContain('agendada correctamente');
	});

	it('provides equivalent length, phone, and signature validation messages in both locales', () => {
		const english = englishForms.Forms.common.validation;
		const spanish = spanishForms.Forms.common.validation;

		expect(english.invalidPhone).toContain('10 to 15 digits');
		expect(spanish.invalidPhone).toContain('10 a 15 digitos');
		expect(english.tooLong).toContain('{max}');
		expect(spanish.tooLong).toContain('{max}');
		expect(english.signatureTooLarge).toContain('signature is too large');
		expect(spanish.signatureTooLarge).toContain('firma es demasiado grande');
	});
});
