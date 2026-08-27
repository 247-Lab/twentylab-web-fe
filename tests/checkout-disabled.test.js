import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { isPublicCheckoutEnabled, resolvePublicCheckoutConfig } from '../src/lib/checkout.js';

const checkoutSource = await readFile(new URL('../src/components/checkout/CheckoutPage.jsx', import.meta.url), 'utf8');
const cartDrawerSource = await readFile(new URL('../src/components/cart/CartDrawer.jsx', import.meta.url), 'utf8');
const englishMessages = JSON.parse(await readFile(new URL('../locales/en/common.json', import.meta.url), 'utf8'));
const spanishMessages = JSON.parse(await readFile(new URL('../locales/es/common.json', import.meta.url), 'utf8'));

describe('checkout containment', () => {
	it('defaults to disabled and requires the exact true value', () => {
		expect(isPublicCheckoutEnabled({})).toBe(false);
		expect(isPublicCheckoutEnabled({ enabled: 'false' })).toBe(false);
		expect(isPublicCheckoutEnabled({ enabled: 'TRUE' })).toBe(false);
		expect(isPublicCheckoutEnabled({ enabled: 'true' })).toBe(true);
		expect(resolvePublicCheckoutConfig({ enabled: 'false' })).toEqual({ enabled: false });
	});

	it('keeps the disabled page and cart message behind the default-off branch', () => {
		expect(checkoutSource).toContain('if (!publicCheckout.enabled)');
		expect(checkoutSource).toContain("t('unavailableTitle')");
		expect(cartDrawerSource).toContain('isPublicCheckoutEnabled()');
		expect(cartDrawerSource).toContain("t('unavailableNotice')");
	});

	it('does not collect or dispatch raw card fields in storefront code', () => {
		expect(checkoutSource).toContain('className="AcceptUI');
		expect(checkoutSource).not.toMatch(/Accept\.dispatchData|cardNumber|cardCode|expirationDate|expMonth|expYear/);
		expect(checkoutSource).not.toContain('localStorage');
	});

	it('provides English and Spanish safety and outcome copy', () => {
		for (const messages of [englishMessages, spanishMessages]) {
			expect(messages.CheckoutPage.unavailableTitle).toBeTruthy();
			expect(messages.CheckoutPage.selectionStatus).toContain('plural');
			expect(messages.CheckoutPage.confirmationRequired).toBeTruthy();
			expect(messages.CheckoutPage.paymentDeclined).toBeTruthy();
			expect(messages.CheckoutPage.hostedPaymentNotice).toBeTruthy();
			expect(messages.CartDrawer.unavailableNotice).toBeTruthy();
			expect(messages.CartDrawer.checkout).toBeTruthy();
		}
		expect(spanishMessages.CheckoutPage.unavailableTitle).not.toBe(englishMessages.CheckoutPage.unavailableTitle);
	});
});
