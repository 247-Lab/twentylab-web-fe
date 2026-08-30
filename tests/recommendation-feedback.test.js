// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import useRecommendedProducts from '../src/components/common/ai-test-finder/useRecommendedProducts';
import { fetchProducts } from '../src/lib/api';

vi.mock('next-intl', () => ({ useLocale: () => 'en' }));
vi.mock('../src/lib/api', () => ({ fetchProducts: vi.fn() }));

globalThis.React = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const selectedProductIds = Object.freeze([17]);
let container;
let root;

function Harness() {
	const result = useRecommendedProducts({ isOpen: true, step: 5, selectedProductIds });
	return React.createElement(
		'div',
		null,
		React.createElement('span', { 'data-failed': result.loadFailed }, String(result.recommendedProducts.length)),
		React.createElement('button', { onClick: result.retryRecommendedProducts }, 'retry')
	);
}

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

it('shows a catalog failure instead of invented products and can retry', async () => {
	fetchProducts.mockRejectedValueOnce(new Error('private upstream detail'));
	await act(async () => root.render(React.createElement(Harness)));
	expect(container.querySelector('[data-failed="true"]')?.textContent).toBe('0');

	fetchProducts.mockResolvedValueOnce([
		{ id: 17, name: 'Synthetic test', mainImage: '/synthetic.png', salePrice: 25, regularPrice: 30 },
	]);
	await act(async () => container.querySelector('button').click());
	expect(container.querySelector('[data-failed="false"]')?.textContent).toBe('1');
});

it('fails visibly when the recommendation tree references a missing catalog product', async () => {
	fetchProducts.mockResolvedValueOnce([]);
	await act(async () => root.render(React.createElement(Harness)));
	expect(container.querySelector('[data-failed="true"]')?.textContent).toBe('0');
});
