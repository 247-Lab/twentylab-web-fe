import { describe, expect, it } from 'vitest';
import {
	buildCheckoutPayload,
	checkoutReviewFailureKey,
	checkoutCartItems,
	formatCents,
	newPaymentAttemptIdempotencyKey,
	resolvePublicCheckoutConfig,
	validateAcceptUiResponse,
} from '../src/lib/checkout.js';

describe('checkout workflow helpers', () => {
	it('selects one exact hosted Authorize.Net environment only when enabled', () => {
		expect(
			resolvePublicCheckoutConfig({
				enabled: 'true',
				environment: 'sandbox',
				apiLoginId: ' public-login ',
				clientKey: ' public-key ',
			})
		).toEqual({
			enabled: true,
			environment: 'sandbox',
			apiLoginId: 'public-login',
			clientKey: 'public-key',
			scriptUrl: 'https://jstest.authorize.net/v3/AcceptUI.js',
		});
		expect(() =>
			resolvePublicCheckoutConfig({ enabled: 'true', environment: 'preview', apiLoginId: 'x', clientKey: 'y' })
		).toThrow('environment');
	});

	it('sends only numeric product IDs and bounded quantities for server pricing', () => {
		expect(
			checkoutCartItems([
				{ id: '9', quantity: 2, name: 'ignored', price: 1 },
				{ id: 4, quantity: 1 },
				{ id: 9, quantity: 3 },
				{ id: 20, variantId: 14, quantity: 2, name: 'selected variant' },
			])
		).toEqual([
			{ productId: 4, quantity: 1 },
			{ productId: 9, quantity: 5 },
			{ productId: 14, quantity: 2 },
		]);
		expect(() => checkoutCartItems([{ id: 'not-a-product', quantity: 1 }])).toThrow('invalid product');
		expect(() => checkoutCartItems([{ id: 1, quantity: 101 }])).toThrow('invalid quantity');
	});

	it('constructs the exact backend capability payload without cart names or prices', () => {
		const payload = buildCheckoutPayload({
			form: {
				firstname: 'Test',
				lastname: 'Customer',
				country: 'United States',
				house_number: '100 Example Street',
				apartment: '',
				city: 'Philadelphia',
				countrystate: 'Pennsylvania',
				zipcode: '19103',
				phone: '215-555-0100',
				emailaddress: 'synthetic@example.test',
				appointment_time: '2026-09-01T10:00',
				additional_information: '',
			},
			items: [{ id: '12', quantity: 1, name: 'Not transmitted', price: 999 }],
			couponId: 7,
		});
		expect(payload.items).toEqual([{ productId: 12, quantity: 1 }]);
		expect(payload.coupon_id).toBe(7);
		expect(JSON.stringify(payload)).not.toContain('Not transmitted');
		expect(JSON.stringify(payload)).not.toContain('999');
	});

	it('accepts only the documented opaque nonce shape and never card metadata', () => {
		const result = validateAcceptUiResponse({
			messages: { resultCode: 'Ok' },
			opaqueData: {
				dataDescriptor: 'COMMON.ACCEPT.INAPP.PAYMENT',
				dataValue: 'one-time-nonce',
			},
			encryptedCardData: { cardNumber: 'XXXXXXXXXXXX1111' },
		});
		expect(result).toEqual({
			outcome: 'tokenized',
			opaqueData: {
				dataDescriptor: 'COMMON.ACCEPT.INAPP.PAYMENT',
				dataValue: 'one-time-nonce',
			},
		});
		expect(result).not.toHaveProperty('encryptedCardData');
		expect(validateAcceptUiResponse({ messages: { resultCode: 'Error' } })).toEqual({
			outcome: 'tokenization_error',
		});
	});

	it('requires a cryptographically generated UUIDv4 and formats only integer cents', () => {
		expect(newPaymentAttemptIdempotencyKey({ randomUUID: () => '7EC8EFAE-650C-4D7C-8F0C-7600EE5B31C1' })).toBe(
			'7ec8efae-650c-4d7c-8f0c-7600ee5b31c1'
		);
		expect(() => newPaymentAttemptIdempotencyKey({ randomUUID: () => 'predictable' })).toThrow('Secure');
		expect(formatCents(12345, 'en')).toBe('$123.45');
		expect(formatCents(12.5, 'en')).toBe('');
	});

	it('maps checkout rejections to a specific nontechnical recovery instruction', () => {
		expect(checkoutReviewFailureKey({ code: 'CHECKOUT_PRODUCT_UNAVAILABLE' })).toBe('productUnavailable');
		expect(checkoutReviewFailureKey({ code: 'CHECKOUT_COUPON_INVALID' })).toBe('couponNoLongerValid');
		expect(checkoutReviewFailureKey({ code: 'CHECKOUT_APPOINTMENT_INVALID' })).toBe('appointmentInvalid');
		expect(checkoutReviewFailureKey({ code: 'CHECKOUT_INPUT_INVALID' })).toBe('detailsInvalid');
		expect(checkoutReviewFailureKey({ code: 'CHECKOUT_ITEMS_INVALID' })).toBe('cartInvalid');
		expect(checkoutReviewFailureKey({ code: 'CHECKOUT_PRICING_CHANGED' })).toBe('pricingChanged');
		expect(checkoutReviewFailureKey({ status: 429 })).toBe('tooManyRequests');
		expect(checkoutReviewFailureKey({ status: 503 })).toBe('checkoutUnavailable');
		expect(checkoutReviewFailureKey({ status: 502 })).toBe('submitError');
	});
});
