import { beforeAll, describe, expect, it } from 'vitest';
let api;
beforeAll(async () => {
	process.env.NEXT_PUBLIC_MODE = 'prod';
	process.env.NEXT_PUBLIC_PROD_API_URL = 'https://example.test';
	api = await import('../src/lib/api');
});
const response = (status, payload) => new Response(JSON.stringify(payload), { status });
describe('public form outcome feedback', () => {
	it('distinguishes known rejection and rate limits from an uncertain save', async () => {
		for (const [status, payload, kind] of [
			[
				400,
				{ code: 'FORM_VALIDATION_FAILED', received: false, fieldErrors: [{ field: 'email', code: 'invalidEmail' }] },
				'validation',
			],
			[429, {}, 'rate_limited'],
			[413, {}, 'too_large'],
			[500, { error: 'private database details' }, 'uncertain'],
			[502, {}, 'uncertain'],
			[201, { message: 'ok' }, 'uncertain'],
		]) {
			await expect(
				api.submitContactForm({}, async (_url, options) =>
					response(status, {
						...payload,
						requestId: options.headers['X-Request-ID'],
					})
				)
			).rejects.toMatchObject({ kind });
		}
	});
	it('treats a lost response as uncertain, with a safe reference and no automatic retry', async () => {
		let calls = 0;
		const send = async (_url, options) => {
			calls++;
			expect(options.signal).toBeInstanceOf(AbortSignal);
			expect(options.headers['X-Request-ID']).toMatch(/^[a-f0-9-]{36}$/);
			throw new Error('private network details');
		};
		await expect(api.submitContactForm({}, send)).rejects.toMatchObject({ kind: 'uncertain' });
		expect(calls).toBe(1);
	});
	it('requires a persisted receipt for success on all five forms and does not claim email delivery', async () => {
		for (const [fn, type] of [
			['submitContactForm', 'contact'],
			['submitAppointmentForm', 'appointment'],
			['submitPatientIntakeForm', 'patient_intake'],
			['submitPrescriptionConsentForm', 'consent'],
			['submitCovidScreeningForm', 'covid_screening'],
		]) {
			const result = await api[fn]({}, async (_url, options) =>
				response(201, {
					id: 17,
					submitted: true,
					form_type: type,
					requestId: options.headers['X-Request-ID'],
				})
			);
			expect(result).toMatchObject({ id: 17, submitted: true, form_type: type });
			expect(result).not.toHaveProperty('delivered');
		}
	});

	it('does not accept a receipt or field rejection with a different request reference', async () => {
		for (const [status, payload] of [
			[201, { id: 17, submitted: true, form_type: 'contact' }],
			[400, { code: 'FORM_VALIDATION_FAILED', received: false, fieldErrors: [] }],
		]) {
			await expect(
				api.submitContactForm({}, async () =>
					response(status, {
						...payload,
						requestId: 'different-request',
					})
				)
			).rejects.toMatchObject({ kind: 'uncertain' });
		}
	});
});
