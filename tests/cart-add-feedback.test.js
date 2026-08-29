// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import TestingServiceCard from '../src/components/testing-services/components/TestingServiceCard';

const addToCart = vi.hoisted(() => vi.fn(() => false));
vi.mock('next-intl', () => ({
	useLocale: () => 'en',
	useTranslations: () => (key, values) => (values ? `${key}:${JSON.stringify(values)}` : key),
}));
vi.mock('next/image', () => ({
	default: ({ fill: _fill, ...props }) => React.createElement('img', props),
}));
vi.mock('next/link', () => ({
	default: ({ children, ...props }) => React.createElement('a', props, children),
}));
vi.mock('../src/components/cart/CartProvider', () => ({ useCart: () => ({ addToCart }) }));

globalThis.React = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let container;
let root;

beforeEach(() => {
	vi.clearAllMocks();
	container = document.createElement('div');
	document.body.appendChild(container);
	root = createRoot(container);
});

afterEach(async () => {
	await act(async () => root.unmount());
	container.remove();
});

it('explains why an unavailable-price item was not added', async () => {
	await act(async () =>
		root.render(
			React.createElement(TestingServiceCard, {
				product: {
					id: 7,
					name: 'Synthetic test',
					description: 'Synthetic description',
					categories: [],
					variants: [],
					regularPrice: null,
					salePrice: null,
					mainImage: '/images/placeholder.png',
				},
			})
		)
	);

	const button = [...container.querySelectorAll('button')].find((candidate) => candidate.textContent === 'addToCart');
	await act(async () => button.click());

	expect(addToCart).toHaveBeenCalledTimes(1);
	expect(container.querySelector('[role="alert"]').textContent).toBe('cartItemUnavailable');
	expect(container.textContent).not.toContain('addedToCart');
});
