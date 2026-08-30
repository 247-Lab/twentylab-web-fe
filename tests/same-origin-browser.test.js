import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const browserOrigin = 'https://synthetic.cloudfront.net';

beforeEach(() => {
	vi.resetModules();
	vi.stubEnv('NEXT_PUBLIC_MODE', 'prod');
	vi.stubEnv('NEXT_PUBLIC_PROD_API_URL', 'same-origin');
	vi.stubEnv('INTERNAL_API_URL', 'http://backend:3000');
	vi.stubGlobal('window', { location: { origin: browserOrigin } });
});

afterEach(() => {
	vi.unstubAllGlobals();
	vi.unstubAllEnvs();
});

function jsonResponse(status, payload) {
	return new Response(JSON.stringify(payload), { status, headers: { 'content-type': 'application/json' } });
}

describe('same-origin preview browser contract', () => {
	it('continues omitting cookies for an explicitly configured cross-origin API', async () => {
		vi.stubEnv('NEXT_PUBLIC_PROD_API_URL', 'https://api.example.test');
		const api = await import('../src/lib/api');
		const fetchMock = vi.fn(async (_url, options) =>
			jsonResponse(201, {
				id: 1,
				form_type: 'contact',
				submitted: true,
				requestId: options.headers['X-Request-ID'],
			})
		);
		vi.stubGlobal('fetch', fetchMock);
		await api.submitContactForm({ synthetic: true });
		expect(fetchMock).toHaveBeenCalledWith(
			'https://api.example.test/api/forms',
			expect.objectContaining({ credentials: 'omit' })
		);
	});

	it('sends all five forms to the opened host with only same-origin credentials', async () => {
		const api = await import('../src/lib/api');
		const fetchMock = vi.fn(async (_url, options) => {
			const { form_type: formType } = JSON.parse(options.body);
			return jsonResponse(201, {
				id: 1,
				form_type: formType,
				submitted: true,
				requestId: options.headers['X-Request-ID'],
			});
		});
		vi.stubGlobal('fetch', fetchMock);
		for (const name of [
			'submitContactForm',
			'submitAppointmentForm',
			'submitPatientIntakeForm',
			'submitPrescriptionConsentForm',
			'submitCovidScreeningForm',
		]) {
			await api[name]({ synthetic: true });
		}
		expect(fetchMock).toHaveBeenCalledTimes(5);
		for (const [url, options] of fetchMock.mock.calls) {
			expect(url).toBe(`${browserOrigin}/api/forms`);
			expect(options).toMatchObject({ credentials: 'same-origin', cache: 'no-store', referrerPolicy: 'no-referrer' });
			expect(options.headers.Authorization).toBeUndefined();
		}
	});

	it('preserves the preview cookie for checkout capabilities and payment submission', async () => {
		const api = await import('../src/lib/api');
		const checkout = vi.fn(async () =>
			jsonResponse(201, {
				success: true,
				data: {
					checkoutToken: 'A'.repeat(43),
					expiresAt: '2026-09-01T15:00:00Z',
					amountCents: 100,
					currency: 'USD',
					items: [{ productId: 1, quantity: 1, unitPriceCents: 100, lineTotalCents: 100 }],
				},
			})
		);
		await api.createCheckoutCapability({ items: [{ productId: 1, quantity: 1 }] }, checkout);
		expect(checkout).toHaveBeenCalledWith(
			`${browserOrigin}/api/payment/checkout`,
			expect.objectContaining({ credentials: 'same-origin' })
		);
		const payment = vi.fn(async () => jsonResponse(200, { success: true, data: { orderId: 1, status: 'processing' } }));
		await api.processCheckoutPayment({}, payment);
		expect(payment).toHaveBeenCalledWith(
			`${browserOrigin}/api/payment/process`,
			expect.objectContaining({ credentials: 'same-origin' })
		);
	});

	it('keeps paginated and localized browser content queries on the preview host', async () => {
		const api = await import('../src/lib/api');
		const fetchMock = vi.fn(async () => jsonResponse(200, { products: [], total: 0, pages: 0, page: 1, limit: 100 }));
		vi.stubGlobal('fetch', fetchMock);
		await api.fetchProducts('es');
		expect(String(fetchMock.mock.calls[0][0])).toBe(`${browserOrigin}/api/products?locale=es&page=1&limit=100`);
		expect(fetchMock.mock.calls[0][1].credentials).toBe('same-origin');
	});

	it('normalizes approved legacy inline images without changing public canonical links', async () => {
		const { sanitizeCmsHtml } = await import('../src/lib/htmlSanitizer');
		const html = sanitizeCmsHtml(
			'<a href="https://24-7labs.com/blog/">Blog</a><img src="https://24-7labs.com/wp-content/uploads/test.jpg" onerror="alert(1)">'
		);
		expect(html).toContain('src="/wp-content/uploads/test.jpg"');
		expect(html).toContain('href="https://24-7labs.com/blog/"');
		expect(html).not.toContain('onerror');
	});
});
