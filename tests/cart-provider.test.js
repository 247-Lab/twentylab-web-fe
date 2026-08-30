// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { CartProvider, useCart } from '../src/components/cart/CartProvider';
import { CART_STORAGE_KEY, MAX_CART_ITEM_QUANTITY, normalizeCart, readCartFromStorage } from '../src/lib/cart';

globalThis.React = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let container;
let root;

function CartCount() {
	const { addToCart, cart, cartPersistenceError } = useCart();
	return React.createElement(
		React.Fragment,
		null,
		React.createElement('span', null, String(cart.itemCount)),
		React.createElement('output', null, String(cartPersistenceError)),
		React.createElement(
			'button',
			{ type: 'button', onClick: () => addToCart({ id: 9, name: 'Added item', regular_price: 12 }) },
			'Add'
		)
	);
}

function CartAddOutcome() {
	const { addToCart, cart } = useCart();
	const [accepted, setAccepted] = React.useState('');
	return React.createElement(
		React.Fragment,
		null,
		React.createElement('span', null, String(cart.itemCount)),
		React.createElement('output', null, accepted),
		React.createElement(
			'button',
			{ type: 'button', onClick: () => setAccepted(String(addToCart({ id: 9, name: 'Unavailable' }))) },
			'Add unavailable'
		)
	);
}

function CartClearOutcome() {
	const { clearCart, cart } = useCart();
	const [saved, setSaved] = React.useState('');
	return React.createElement(
		React.Fragment,
		null,
		React.createElement('span', null, String(cart.itemCount)),
		React.createElement('output', null, saved),
		React.createElement('button', { type: 'button', onClick: () => setSaved(String(clearCart())) }, 'Clear')
	);
}

beforeEach(() => {
	localStorage.clear();
	container = document.createElement('div');
	document.body.appendChild(container);
	root = createRoot(container);
});

afterEach(async () => {
	await act(async () => root.unmount());
	container.remove();
	vi.restoreAllMocks();
});

it('hydrates without overwriting the saved cart and follows a clear from another tab', async () => {
	localStorage.setItem(
		CART_STORAGE_KEY,
		JSON.stringify({
			items: [
				{
					id: '7',
					key: '7',
					name: 'Synthetic product',
					price: 10,
					quantity: 1,
				},
			],
		})
	);
	const writes = vi.spyOn(Storage.prototype, 'setItem');

	await act(async () => root.render(React.createElement(CartProvider, null, React.createElement(CartCount))));

	expect(container.querySelector('span').textContent).toBe('1');
	expect(writes).not.toHaveBeenCalled();

	localStorage.setItem(CART_STORAGE_KEY, JSON.stringify({ items: [] }));
	await act(async () =>
		window.dispatchEvent(
			new StorageEvent('storage', {
				key: CART_STORAGE_KEY,
				newValue: JSON.stringify({ items: [] }),
			})
		)
	);

	expect(container.querySelector('span').textContent).toBe('0');
	expect(writes).toHaveBeenCalledTimes(1);
});

it('keeps the in-page cart visible and exposes a warning when browser storage rejects an update', async () => {
	await act(async () => root.render(React.createElement(CartProvider, null, React.createElement(CartCount))));
	vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
		throw new DOMException('Storage unavailable', 'QuotaExceededError');
	});

	await act(async () => container.querySelector('button').click());

	expect(container.querySelector('span').textContent).toBe('1');
	expect(container.querySelector('output').textContent).toBe('true');
});

it('retries persistence when an already-cleared in-page cart still exists in browser storage', async () => {
	localStorage.setItem(
		CART_STORAGE_KEY,
		JSON.stringify({ items: [{ id: 7, name: 'Paid item', price: 10, quantity: 1 }] })
	);
	await act(async () => root.render(React.createElement(CartProvider, null, React.createElement(CartClearOutcome))));

	const originalSetItem = Storage.prototype.setItem;
	const writes = vi
		.spyOn(Storage.prototype, 'setItem')
		.mockImplementationOnce(() => {
			throw new DOMException('Storage unavailable', 'QuotaExceededError');
		})
		.mockImplementation(function (...args) {
			return originalSetItem.apply(this, args);
		});

	await act(async () => container.querySelector('button').click());
	expect(container.querySelector('span').textContent).toBe('0');
	expect(container.querySelector('output').textContent).toBe('false');
	expect(JSON.parse(localStorage.getItem(CART_STORAGE_KEY)).items).toHaveLength(1);

	await act(async () => container.querySelector('button').click());
	expect(container.querySelector('output').textContent).toBe('true');
	expect(JSON.parse(localStorage.getItem(CART_STORAGE_KEY)).items).toEqual([]);
	expect(writes).toHaveBeenCalledTimes(2);
});

it('warns instead of silently presenting an empty cart when saved cart data cannot be read', async () => {
	vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
		throw new DOMException('Storage unavailable', 'SecurityError');
	});

	await act(async () => root.render(React.createElement(CartProvider, null, React.createElement(CartCount))));

	expect(container.querySelector('span').textContent).toBe('0');
	expect(container.querySelector('output').textContent).toBe('true');
});

it('preserves the visible cart when a cross-tab refresh cannot read browser storage', async () => {
	localStorage.setItem(
		CART_STORAGE_KEY,
		JSON.stringify({ items: [{ id: 7, name: 'Synthetic product', price: 10, quantity: 2 }] })
	);
	await act(async () => root.render(React.createElement(CartProvider, null, React.createElement(CartCount))));
	expect(container.querySelector('span').textContent).toBe('2');

	vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
		throw new DOMException('Storage unavailable', 'SecurityError');
	});
	await act(async () => window.dispatchEvent(new StorageEvent('storage', { key: CART_STORAGE_KEY, newValue: null })));

	expect(container.querySelector('span').textContent).toBe('2');
	expect(container.querySelector('output').textContent).toBe('true');
});

it('reconciles a suspended tab with the persisted cart when it becomes active again', async () => {
	localStorage.setItem(
		CART_STORAGE_KEY,
		JSON.stringify({ items: [{ id: 7, name: 'Synthetic product', price: 10, quantity: 2 }] })
	);
	await act(async () => root.render(React.createElement(CartProvider, null, React.createElement(CartCount))));
	expect(container.querySelector('span').textContent).toBe('2');

	localStorage.setItem(CART_STORAGE_KEY, JSON.stringify({ items: [] }));
	expect(container.querySelector('span').textContent).toBe('2');
	await act(async () => window.dispatchEvent(new Event('focus')));
	expect(container.querySelector('span').textContent).toBe('0');
});

it('marks malformed saved cart JSON as unreadable', () => {
	const storage = { getItem: () => '{not-json' };
	const result = readCartFromStorage(storage);

	expect(result.readable).toBe(false);
	expect(result.cart.items).toEqual([]);
});

it('drops invalid product ids, derives safe keys, and caps quantities before rendering', () => {
	const normalized = normalizeCart({
		items: [
			{ id: 'not-a-product', key: 'attacker-key', quantity: 4 },
			{
				id: 9,
				variantId: 12,
				key: 'untrusted-key',
				name: { unsafe: true },
				image: { unsafe: true },
				quantity: 101,
				price: 10,
			},
		],
	});

	expect(normalized.items).toEqual([
		expect.objectContaining({
			id: '9',
			variantId: '12',
			key: '9:12',
			name: 'Product 9',
			image: '/images/placeholder.png',
			quantity: MAX_CART_ITEM_QUANTITY,
		}),
	]);
});

it('combines duplicate saved keys without exceeding the checkout quantity limit', () => {
	const normalized = normalizeCart({
		items: [
			{ id: 9, key: 'untrusted-one', quantity: 80, price: 10 },
			{ id: 9, key: 'untrusted-two', quantity: 80, price: 10 },
		],
	});

	expect(normalized.items).toHaveLength(1);
	expect(normalized.items[0]).toMatchObject({ id: '9', key: '9', quantity: 100 });
});

it('does not display a negative or otherwise invalid saved price', () => {
	const normalized = normalizeCart({
		items: [{ id: 9, name: 'Synthetic product', price: -25, quantity: 1 }],
	});

	expect(normalized.items).toEqual([]);
	expect(normalized.subtotal).toBe(0);
});

it('marks a persisted cart with unusable price evidence as unreadable instead of showing a free item', () => {
	const storage = {
		getItem: () => JSON.stringify({ items: [{ id: 9, name: 'Synthetic product', price: -25, quantity: 1 }] }),
	};
	const result = readCartFromStorage(storage);
	expect(result.readable).toBe(false);
	expect(result.cart.items).toEqual([]);
});

it('rejects a newly selected item whose price cannot be shown instead of claiming it was added', async () => {
	await act(async () => root.render(React.createElement(CartProvider, null, React.createElement(CartAddOutcome))));
	await act(async () => container.querySelector('button').click());

	expect(container.querySelector('span').textContent).toBe('0');
	expect(container.querySelector('output').textContent).toBe('false');
	expect(localStorage.getItem(CART_STORAGE_KEY)).toBeNull();
});
