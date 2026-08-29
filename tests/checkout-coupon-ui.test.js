// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import CheckoutPage from '../src/components/checkout/CheckoutPage';
import * as api from '../src/lib/api';

vi.mock('next-intl', () => ({ useLocale: () => 'en', useTranslations: () => (key) => key }));
vi.mock('next/script', () => ({ default: () => null }));
vi.mock('next/link', () => ({
	default: ({ children, ...props }) => React.createElement('a', props, children),
}));
vi.mock('../src/components/cart/CartProvider', () => ({
	useCart: () => ({
		cart: { items: [{ id: 1, key: 'one', quantity: 1, name: 'Synthetic' }] },
		clearCart: vi.fn(),
	}),
}));
vi.mock('../src/lib/api', () => ({
	createCheckoutCapability: vi.fn(),
	processCheckoutPayment: vi.fn(),
	createPaymentStatusTicket: vi.fn(),
	checkCheckoutPaymentStatus: vi.fn(),
	validateCoupon: vi.fn(),
}));
vi.mock('../src/lib/checkout', async (importOriginal) => ({
	...(await importOriginal()),
	resolvePublicCheckoutConfig: () => ({
		enabled: true,
		environment: 'sandbox',
		scriptUrl: 'https://example.test/card.js',
	}),
}));

globalThis.React = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let container;
let root;

function changeInput(input, value) {
	const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
	setter.call(input, value);
	input.dispatchEvent(new Event('input', { bubbles: true }));
}

beforeEach(async () => {
	vi.clearAllMocks();
	localStorage.clear();
	container = document.createElement('div');
	document.body.appendChild(container);
	root = createRoot(container);
	await act(async () => root.render(React.createElement(CheckoutPage)));
});

afterEach(async () => {
	await act(async () => root.unmount());
	container.remove();
});

it('ignores a stale coupon response after the shopper changes the code', async () => {
	let resolveFirst;
	api.validateCoupon
		.mockImplementationOnce(
			() =>
				new Promise((resolve) => {
					resolveFirst = resolve;
				})
		)
		.mockResolvedValueOnce({ valid: true, id: 2, code: 'NEW10', discount: 20 });

	const input = container.querySelector('input[placeholder="couponPlaceholder"]');
	const apply = () => [...container.querySelectorAll('button')].find((button) => button.textContent === 'applyCoupon');

	await act(async () => changeInput(input, 'OLD10'));
	await act(async () => apply().click());
	await act(async () => changeInput(input, 'NEW10'));
	await act(async () => apply().click());
	expect(container.textContent).toContain('NEW10 (20%)');

	await act(async () => resolveFirst({ valid: true, id: 1, code: 'OLD10', discount: 10 }));
	expect(container.textContent).toContain('NEW10 (20%)');
	expect(container.textContent).not.toContain('OLD10 (10%)');
});
