import { beforeAll, describe, expect, it } from 'vitest';

let createCheckoutCapability;
let processCheckoutPayment;
let createPaymentStatusTicket;
let checkCheckoutPaymentStatus;
let validateCoupon;
let PublicApiError;

beforeAll(async () => {
	process.env.NEXT_PUBLIC_MODE = 'prod';
	process.env.NEXT_PUBLIC_PROD_API_URL = 'https://api.example.test';
	({
		createCheckoutCapability,
		processCheckoutPayment,
		createPaymentStatusTicket,
		checkCheckoutPaymentStatus,
		validateCoupon,
		PublicApiError,
	} = await import('../src/lib/api.js'));
});

function jsonResponse(status, payload) {
	return new Response(JSON.stringify(payload), {
		status,
		headers: { 'content-type': 'application/json' },
	});
}

describe('checkout API client', () => {
	it('requests a server-priced capability with privacy-restrictive browser options', async () => {
		let request;
		const result = await createCheckoutCapability(
			{ firstname: 'Synthetic', items: [{ productId: 12, quantity: 1 }] },
			async (url, options) => {
				request = { url, options };
				return jsonResponse(201, {
					success: true,
					data: {
						checkoutToken: 'A'.repeat(43),
						expiresAt: '2026-09-01T15:00:00.000Z',
						amountCents: 12345,
						currency: 'USD',
						items: [{ productId: 12, quantity: 1, unitPriceCents: 12345, lineTotalCents: 12345 }],
					},
				});
			}
		);
		expect(result.amountCents).toBe(12345);
		expect(request.url).toBe('https://api.example.test/api/payment/checkout');
		expect(request.options).toMatchObject({
			method: 'POST',
			cache: 'no-store',
			credentials: 'omit',
			referrerPolicy: 'no-referrer',
		});
		expect(JSON.parse(request.options.body)).toEqual({
			firstname: 'Synthetic',
			items: [{ productId: 12, quantity: 1 }],
		});
	});

	it('rejects malformed capability envelopes', async () => {
		await expect(
			createCheckoutCapability({ items: [{ productId: 1, quantity: 2 }] }, async () =>
				jsonResponse(201, {
					success: true,
					data: {
						checkoutToken: 'A'.repeat(43),
						expiresAt: '2026-09-01T15:00:00.000Z',
						amountCents: 100,
						currency: 'USD',
						items: [{ productId: 1, quantity: 2, unitPriceCents: 50, lineTotalCents: 99 }],
					},
				})
			)
		).rejects.toMatchObject({ name: 'PublicApiError', status: 502 });
	});

	it('preserves a stable checkout correction code without trusting other response fields', async () => {
		await expect(
			createCheckoutCapability({ items: [{ productId: 1, quantity: 1 }] }, async () =>
				jsonResponse(409, {
					success: false,
					error: 'One or more products are unavailable',
					code: 'CHECKOUT_PRODUCT_UNAVAILABLE',
					privateDetail: 'must not be exposed',
				})
			)
		).rejects.toMatchObject({
			name: 'PublicApiError',
			status: 409,
			code: 'CHECKOUT_PRODUCT_UNAVAILABLE',
		});
	});

	it('rejects a quote for a different product selection than the submitted cart', async () => {
		await expect(
			createCheckoutCapability({ items: [{ productId: 12, quantity: 1 }] }, async () =>
				jsonResponse(201, {
					success: true,
					data: {
						checkoutToken: 'A'.repeat(43),
						expiresAt: '2026-09-01T15:00:00.000Z',
						amountCents: 12345,
						currency: 'USD',
						items: [{ productId: 13, quantity: 1, unitPriceCents: 12345, lineTotalCents: 12345 }],
					},
				})
			)
		).rejects.toMatchObject({ name: 'PublicApiError', status: 502 });
	});

	it('distinguishes success, an explicit decline, and an explicit uncertain outcome', async () => {
		await expect(
			processCheckoutPayment({}, async () =>
				jsonResponse(200, { success: true, data: { orderId: 42, status: 'processing' } })
			)
		).resolves.toEqual({ outcome: 'succeeded', orderId: 42 });
		await expect(
			processCheckoutPayment({}, async () => jsonResponse(402, { success: false, error: 'Payment was declined' }))
		).resolves.toEqual({ outcome: 'declined' });
		await expect(
			processCheckoutPayment({}, async () =>
				jsonResponse(202, { success: false, error: 'Payment is being confirmed. Do not retry.' })
			)
		).resolves.toEqual({ outcome: 'confirmation_required' });
	});

	it('treats an unrecognized payment response as an error rather than inviting retry', async () => {
		await expect(
			processCheckoutPayment({}, async () => jsonResponse(402, { success: false, error: 'Proxy response' }))
		).rejects.toBeInstanceOf(PublicApiError);
	});

	it('uses a separate read-only status ticket and rejects inconsistent terminal evidence', async () => {
		const ticket = {
			reference: 'PAY-17',
			statusToken: `status-v1.17.1800000000.${'a'.repeat(43)}.${'b'.repeat(43)}`,
		};
		await expect(
			createPaymentStatusTicket({}, async () => jsonResponse(200, { success: true, data: ticket }))
		).resolves.toEqual(ticket);
		await expect(
			checkCheckoutPaymentStatus(ticket, async () =>
				jsonResponse(200, { success: true, data: { reference: 'PAY-17', outcome: 'confirmation_required' } })
			)
		).resolves.toEqual({ outcome: 'confirmation_required' });
		await expect(
			checkCheckoutPaymentStatus(ticket, async () =>
				jsonResponse(200, { success: true, data: { reference: 'PAY-17', outcome: 'not_started' } })
			)
		).resolves.toEqual({ outcome: 'not_started' });
		await expect(
			checkCheckoutPaymentStatus(ticket, async () =>
				jsonResponse(200, { success: true, data: { reference: 'PAY-17', outcome: 'declined', orderId: 99 } })
			)
		).rejects.toBeInstanceOf(PublicApiError);
	});

	it('keeps coupon rejection separate from an outage without exposing response text', async () => {
		await expect(
			validateCoupon('bad', async () => jsonResponse(400, { error: 'private validation detail' }))
		).rejects.toMatchObject({ name: 'PublicApiError', status: 400, message: 'Coupon could not be checked' });
		await expect(
			validateCoupon('test', async () => {
				throw new Error('private network detail');
			})
		).rejects.toMatchObject({ name: 'PublicApiError', status: 0, message: 'Coupon could not be checked' });
	});

	it('accepts only a complete, bounded coupon response', async () => {
		await expect(
			validateCoupon('save10', async () => jsonResponse(200, { valid: true, id: '7', code: 'save10', discount: '10' }))
		).resolves.toEqual({ valid: true, id: 7, code: 'SAVE10', discount: 10 });

		for (const payload of [
			{ valid: true, id: 7, code: 'SAVE10', discount: 0 },
			{ valid: true, id: 7, code: '<unsafe>', discount: 10 },
			{ valid: true, id: 7, code: 'OTHER10', discount: 10 },
			{ valid: true, id: 7, code: 'SAVE10', discount: 10.5 },
		]) {
			await expect(validateCoupon('save10', async () => jsonResponse(200, payload))).rejects.toMatchObject({
				name: 'PublicApiError',
				status: 502,
			});
		}
	});
});
