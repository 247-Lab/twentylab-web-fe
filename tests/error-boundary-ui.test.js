// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import PageError from '../src/app/error';

vi.mock('next-intl', () => ({
	useTranslations: () => (key) =>
		({
			title: 'Page unavailable',
			message: 'Try again',
			retry: 'Load page again',
			submissionCaution: 'Check before repeating',
			contact: 'Contact',
		})[key] || key,
}));
vi.mock('next/link', () => ({ default: ({ children, ...props }) => React.createElement('a', props, children) }));

globalThis.React = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let container;
let root;

beforeEach(() => {
	container = document.createElement('div');
	document.body.appendChild(container);
	root = createRoot(container);
});

afterEach(async () => {
	await act(async () => root.unmount());
	container.remove();
});

describe('page error recovery', () => {
	it('uses the reset callback supplied by the Next.js error boundary', async () => {
		const reset = vi.fn();
		await act(async () => root.render(React.createElement(PageError, { reset })));
		await act(async () => container.querySelector('button').click());
		expect(reset).toHaveBeenCalledOnce();
	});
});
