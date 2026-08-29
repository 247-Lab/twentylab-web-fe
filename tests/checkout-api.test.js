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
		const result = await createCheckoutCapability({ firstname: 'Synthetic' }, async (url, options) => {
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
		});
		expect(result.amountCents).toBe(12345);
		expect(request.url).toBe('https://api.example.test/api/payment/checkout');
		expect(request.options).toMatchObject({
			method: 'POST',
			cache: 'no-store',
			credentials: 'omit',
			referrerPolicy: 'no-referrer',
		});
		expect(JSON.parse(request.options.body)).toEqual({ firstname: 'Synthetic' });
	});

	it('rejects malformed capability envelopes', async () => {
		await expect(
			createCheckoutCapability({}, async () =>
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
});
