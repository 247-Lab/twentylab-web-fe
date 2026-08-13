import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

const checkoutSource = await readFile(new URL('../src/components/checkout/CheckoutPage.jsx', import.meta.url), 'utf8');
const cartDrawerSource = await readFile(new URL('../src/components/cart/CartDrawer.jsx', import.meta.url), 'utf8');
const englishMessages = JSON.parse(await readFile(new URL('../locales/en/common.json', import.meta.url), 'utf8'));
const spanishMessages = JSON.parse(await readFile(new URL('../locales/es/common.json', import.meta.url), 'utf8'));

describe('checkout containment', () => {
	it('does not collect card data or call order/payment APIs until the safe contract exists', () => {
		expect(checkoutSource).toContain("t('unavailableTitle')");
		expect(checkoutSource).not.toMatch(
			/Accept\.dispatchData|createOrder|processPayment|validateCoupon|cardNumber|cardCode|firstname|lastname|emailaddress|appointment_time|AFTER_HOURS_FEE|subtotal|total|<form|<input|<textarea|<select/
		);
	});

	it('does not present a checkout price preview or actionable checkout control', () => {
		expect(cartDrawerSource).toContain("t('unavailableNotice')");
		expect(cartDrawerSource).not.toMatch(/item\.price|cart\.subtotal|toCurrency|href="\/checkout"|t\('checkout'\)/);
	});

	it('provides English and Spanish checkout-disabled safety copy', () => {
		for (const messages of [englishMessages, spanishMessages]) {
			expect(messages.CheckoutPage.unavailableTitle).toBeTruthy();
			expect(messages.CheckoutPage.unavailableMessage).toBeTruthy();
			expect(messages.CheckoutPage.selectionStatus).toContain('plural');
			expect(messages.CheckoutPage.contactLabs).toBeTruthy();
			expect(messages.CheckoutPage.returnToServices).toBeTruthy();
			expect(messages.CartDrawer.quantity).toBeTruthy();
			expect(messages.CartDrawer.unavailableNotice).toBeTruthy();
			expect(messages.CartDrawer.contactLabs).toBeTruthy();
		}
		expect(spanishMessages.CheckoutPage.unavailableTitle).not.toBe(englishMessages.CheckoutPage.unavailableTitle);
	});
});
