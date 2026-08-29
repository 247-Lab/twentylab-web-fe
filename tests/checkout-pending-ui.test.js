// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import CheckoutPage from '../src/components/checkout/CheckoutPage';
import * as api from '../src/lib/api';

const state = vi.hoisted(() => ({ cart: { items: [{ id: 1, key: 'one', quantity: 1, name: 'Synthetic' }] } }));
vi.mock('next-intl', () => ({ useLocale: () => 'en', useTranslations: () => (key) => key }));
vi.mock('next/script', () => ({ default: () => null }));
vi.mock('next/link', () => ({ default: ({ children, ...props }) => React.createElement('a', props, children) }));
vi.mock('../src/components/cart/CartProvider', () => ({ useCart: () => ({ cart: state.cart, clearCart: vi.fn() }) }));
vi.mock('../src/lib/api', () => ({
	createCheckoutCapability: vi.fn(),
	processCheckoutPayment: vi.fn(),
	createPaymentStatusTicket: vi.fn(),
	checkCheckoutPaymentStatus: vi.fn(),
	validateCoupon: vi.fn(),
}));
vi.mock('../src/lib/checkout', async (importOriginal) => ({
	...(await importOriginal()),
	buildCheckoutPayload: () => ({}),
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
let finishPayment;

beforeEach(async () => {
	vi.clearAllMocks();
	vi.useFakeTimers();
	localStorage.clear();
	Object.defineProperty(navigator, 'locks', {
		configurable: true,
		value: { request: async (_name, _options, run) => run({}) },
	});
	state.cart = { items: [{ id: 1, key: 'one', quantity: 1, name: 'Synthetic' }] };
	api.createCheckoutCapability.mockResolvedValue({
		checkoutToken: 'a'.repeat(43),
		amountCents: 2500,
		expiresAt: new Date(Date.now() + 1000).toISOString(),
		currency: 'USD',
	});
	api.createPaymentStatusTicket.mockResolvedValue({
		reference: 'PAY-17',
		statusToken: `status-v1.17.1800000000.${'a'.repeat(43)}.${'b'.repeat(43)}`,
	});
	api.processCheckoutPayment.mockImplementation(
		() =>
			new Promise((resolve) => {
				finishPayment = resolve;
			})
	);
	container = document.createElement('div');
	document.body.appendChild(container);
	root = createRoot(container);
	await act(async () => root.render(React.createElement(CheckoutPage)));
	await act(async () =>
		container.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
	);
});
afterEach(async () => {
	await act(async () => root.unmount());
	container.remove();
	vi.useRealTimers();
});

it('keeps an in-flight or unconfirmed payment blocked after quote expiry, cart clearing, and reload', async () => {
	let payment;
	await act(async () => {
		payment = window.twentyFourSevenLabsAcceptUiResponseHandler({
			messages: { resultCode: 'Ok' },
			opaqueData: { dataDescriptor: 'COMMON.ACCEPT.INAPP.PAYMENT', dataValue: 'synthetic-nonce' },
		});
	});
	await act(async () => vi.advanceTimersByTime(1500));
	expect(container.textContent).not.toContain('sessionExpired');
	expect(container.textContent).not.toContain('reviewAndConfirm');
	await act(async () => {
		finishPayment({ outcome: 'confirmation_required' });
		await payment;
	});
	expect(container.textContent).toContain('confirmationRequired');
	state.cart = { items: [] };
	await act(async () => root.render(React.createElement(CheckoutPage)));
	expect(container.textContent).toContain('confirmationRequired');
	expect(container.textContent).not.toContain('emptyTitle');
	await act(async () => root.unmount());
	root = createRoot(container);
	await act(async () => root.render(React.createElement(CheckoutPage)));
	expect(container.textContent).toContain('confirmationRequired');
	expect(container.textContent).toContain('PAY-17');
	expect(api.processCheckoutPayment).toHaveBeenCalledTimes(1);
});
