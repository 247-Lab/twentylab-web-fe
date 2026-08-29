import { validRecoveryTicket } from './checkoutRecovery';
import { FormSubmissionError } from './formFeedback';

const COMPILED_PUBLIC_API_CONFIG = {
	mode: process.env.NEXT_PUBLIC_MODE,
	devApiUrl: process.env.NEXT_PUBLIC_DEV_API_URL,
	prodApiUrl: process.env.NEXT_PUBLIC_PROD_API_URL,
};

export function usesSameOriginApi(config = COMPILED_PUBLIC_API_CONFIG) {
	return config.mode === 'prod' && config.prodApiUrl === 'same-origin';
}

export function resolvePublicApiBase(config = COMPILED_PUBLIC_API_CONFIG) {
	const publicBase = config.mode === 'dev' ? config.devApiUrl : config.prodApiUrl;
	if (!publicBase) throw new Error('Public API origin is not configured');
	if (publicBase === 'same-origin' && config.mode !== 'prod') {
		throw new Error('same-origin API mode is supported only for production builds');
	}
	return publicBase.replace(/\/$/, '');
}

export function resolveApiOrigin(config) {
	const publicBase = resolvePublicApiBase(config);
	const internalApiUrl = typeof window === 'undefined' ? config?.internalApiUrl || process.env.INTERNAL_API_URL : null;
	if (publicBase === 'same-origin' && typeof window === 'undefined' && !internalApiUrl) {
		throw new Error('INTERNAL_API_URL is required for server requests in same-origin mode');
	}
	const base = internalApiUrl || (publicBase === 'same-origin' ? window.location.origin : publicBase);

	if (!base) throw new Error('API origin is not configured');
	return `${base.replace(/\/$/, '')}/api`;
}

function publicApiCredentials() {
	// The preview cookie is host-only. Never opt cross-origin APIs into cookies.
	return usesSameOriginApi() ? 'same-origin' : 'omit';
}

const CONTENT_REVALIDATE_SECONDS = 300;
const CONTENT_FETCH_TIMEOUT_MS = 5000;
const PRODUCT_PAGE_SIZE = 100;
const MAX_PRODUCT_PAGE_REQUESTS = 10_000;

const PATH_MAP = {
	BLOGS: 'blogs',
	PRODUCTS: 'products',
	CATEGORIES: 'category',
	FORMS: 'forms',
	COUPONS: 'coupons',
	ORDERS: 'orders',
	PAYMENT: 'payment',
	SEO: 'seo',
};

export const ENDPOINTS = new Proxy(PATH_MAP, {
	get: (target, prop) => (prop in target ? `${resolveApiOrigin()}/${target[prop]}` : target[prop]),
});

function withJsonOptions(body) {
	return {
		method: 'POST',
		headers: {
			Accept: 'application/json',
			'Content-Type': 'application/json',
		},
		body: JSON.stringify(body),
	};
}

async function parsePublicJsonResponse(response) {
	let payload = null;
	try {
		payload = await response.json();
	} catch {
		payload = null;
	}
	return { response, payload };
}

export class PublicApiError extends Error {
	constructor(message, status) {
		super(message);
		this.name = 'PublicApiError';
		this.status = status;
	}
}

export async function createCheckoutCapability(payload, fetchImplementation = fetch) {
	const { response, payload: responsePayload } = await parsePublicJsonResponse(
		await fetchImplementation(`${ENDPOINTS.PAYMENT}/checkout`, {
			...withJsonOptions(payload),
			cache: 'no-store',
			credentials: publicApiCredentials(),
			referrerPolicy: 'no-referrer',
			signal: AbortSignal.timeout(15000),
		})
	);

	if (!response.ok) {
		throw new PublicApiError(responsePayload?.error || 'Checkout is temporarily unavailable', response.status);
	}
	const data = responsePayload?.data;
	const validItems =
		Array.isArray(data?.items) &&
		data.items.length >= 1 &&
		data.items.every(
			(item) =>
				Number.isSafeInteger(item?.productId) &&
				item.productId > 0 &&
				Number.isSafeInteger(item?.quantity) &&
				item.quantity >= 1 &&
				item.quantity <= 100 &&
				Number.isSafeInteger(item?.unitPriceCents) &&
				item.unitPriceCents >= 1 &&
				Number.isSafeInteger(item?.lineTotalCents) &&
				item.lineTotalCents === item.unitPriceCents * item.quantity
		);
	if (
		response.status !== 201 ||
		responsePayload?.success !== true ||
		typeof data?.checkoutToken !== 'string' ||
		!/^[A-Za-z0-9_-]{43}$/.test(data.checkoutToken) ||
		!Number.isSafeInteger(data.amountCents) ||
		data.amountCents < 1 ||
		data.currency !== 'USD' ||
		!validItems ||
		!Number.isFinite(Date.parse(data.expiresAt))
	) {
		throw new PublicApiError('Checkout returned an invalid response', 502);
	}
	return Object.freeze({
		checkoutToken: data.checkoutToken,
		expiresAt: data.expiresAt,
		amountCents: data.amountCents,
		currency: data.currency,
		items: data.items,
	});
}

export async function processCheckoutPayment(payload, fetchImplementation = fetch) {
	const { response, payload: responsePayload } = await parsePublicJsonResponse(
		await fetchImplementation(`${ENDPOINTS.PAYMENT}/process`, {
			...withJsonOptions(payload),
			cache: 'no-store',
			credentials: publicApiCredentials(),
			referrerPolicy: 'no-referrer',
			signal: AbortSignal.timeout(30000),
		})
	);

	if (
		response.status === 200 &&
		responsePayload?.success === true &&
		Number.isSafeInteger(responsePayload?.data?.orderId) &&
		responsePayload.data.orderId > 0 &&
		responsePayload.data.status === 'processing'
	) {
		return Object.freeze({ outcome: 'succeeded', orderId: responsePayload.data.orderId });
	}
	if (
		response.status === 402 &&
		responsePayload?.success === false &&
		responsePayload?.error === 'Payment was declined'
	) {
		return Object.freeze({ outcome: 'declined' });
	}
	if (
		response.status === 202 &&
		responsePayload?.success === false &&
		responsePayload?.error === 'Payment is being confirmed. Do not retry.'
	) {
		return Object.freeze({ outcome: 'confirmation_required' });
	}

	throw new PublicApiError(responsePayload?.error || 'Payment processing is temporarily unavailable', response.status);
}

async function paymentStatusRequest(path, payload, fetchImplementation) {
	const { response, payload: envelope } = await parsePublicJsonResponse(
		await fetchImplementation(`${ENDPOINTS.PAYMENT}/${path}`, {
			...withJsonOptions(payload),
			cache: 'no-store',
			credentials: publicApiCredentials(),
			referrerPolicy: 'no-referrer',
			signal: AbortSignal.timeout(15000),
		})
	);
	if (response.status !== 200 || envelope?.success !== true || !envelope.data) {
		throw new PublicApiError('Payment status could not be checked', response.status);
	}
	return envelope.data;
}

export async function createPaymentStatusTicket(payload, fetchImplementation = fetch) {
	const ticket = await paymentStatusRequest('status-ticket', payload, fetchImplementation);
	if (!validRecoveryTicket(ticket)) throw new PublicApiError('Payment status reference is unavailable', 502);
	return Object.freeze({ statusToken: ticket.statusToken, reference: ticket.reference });
}

export async function checkCheckoutPaymentStatus(ticket, fetchImplementation = fetch) {
	if (!validRecoveryTicket(ticket)) throw new PublicApiError('Payment status could not be confirmed', 400);
	const data = await paymentStatusRequest('status', { statusToken: ticket.statusToken }, fetchImplementation);
	if (
		data.reference !== ticket.reference ||
		!['succeeded', 'declined', 'confirmation_required'].includes(data.outcome) ||
		(data.outcome === 'succeeded' && (!Number.isSafeInteger(data.orderId) || data.orderId < 1)) ||
		(data.outcome !== 'succeeded' && data.orderId !== undefined)
	) {
		throw new PublicApiError('Payment status could not be confirmed', 502);
	}
	return data.outcome === 'succeeded' ? { outcome: data.outcome, orderId: data.orderId } : { outcome: data.outcome };
}

function withFormSubmissionOptions(formType, payload) {
	return {
		...withJsonOptions({
			...payload,
			form_type: formType,
		}),
		cache: 'no-store',
		credentials: publicApiCredentials(),
		referrerPolicy: 'no-referrer',
	};
}

function resolveLocalizedText(value, locale = 'en') {
	if (value === null || value === undefined) {
		return '';
	}

	if (typeof value === 'object' && !Array.isArray(value)) {
		return (
			value[locale] || value.en || Object.values(value).find((entry) => typeof entry === 'string' && entry.trim()) || ''
		);
	}

	if (typeof value === 'string') {
		const trimmed = value.trim();
		if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
			try {
				const parsed = JSON.parse(trimmed);
				return resolveLocalizedText(parsed, locale);
			} catch {
				return value;
			}
		}
	}

	return String(value);
}

function withLocaleQuery(endpoint, locale) {
	const url = new URL(endpoint);
	if (locale) {
		url.searchParams.set('locale', locale);
	}
	return url.toString();
}

export function extractProducts(payload) {
	if (Array.isArray(payload)) {
		return payload;
	}

	if (Array.isArray(payload?.products)) {
		return payload.products;
	}

	if (Array.isArray(payload?.data)) {
		return payload.data;
	}

	if (Array.isArray(payload?.data?.products)) {
		return payload.data.products;
	}

	return [];
}

export function normalizeSameOriginMediaUrl(value, config = COMPILED_PUBLIC_API_CONFIG) {
	if (!usesSameOriginApi(config) || !value) return value;
	try {
		const url = new URL(value.startsWith('//') ? `https:${value}` : value);
		if (
			['http:', 'https:'].includes(url.protocol) &&
			['24-7labs.com', 'www.24-7labs.com', 'api.24-7labs.com'].includes(url.hostname) &&
			!url.port &&
			!url.username &&
			!url.password &&
			(url.pathname.startsWith('/uploads/') || url.pathname.startsWith('/wp-content/uploads/'))
		) {
			return `${url.pathname}${url.search}${url.hash}`;
		}
	} catch {
		// Relative media already belongs to the current browser origin.
	}
	return value;
}

export function resolveImageUrl(value, config = COMPILED_PUBLIC_API_CONFIG) {
	if (!value) {
		return '/images/placeholder.png';
	}

	value = normalizeSameOriginMediaUrl(value, config);
	if (value.startsWith('http://') || value.startsWith('https://')) {
		return value;
	}

	if (value.startsWith('//')) {
		return `https:${value}`;
	}

	if (usesSameOriginApi(config)) return value.startsWith('/') ? value : `/${value}`;

	if (value.startsWith('/')) {
		return `${new URL(resolvePublicApiBase(config)).origin}${value}`;
	}

	return `${new URL(resolvePublicApiBase(config)).origin}/${value}`;
}

export async function collectProductPages(fetchPage) {
	const products = [];
	let expectedTotal;
	let expectedPages;

	for (let page = 1; page <= MAX_PRODUCT_PAGE_REQUESTS; page += 1) {
		const payload = await fetchPage(page, PRODUCT_PAGE_SIZE);
		if (
			!payload ||
			!Array.isArray(payload.products) ||
			!Number.isSafeInteger(payload.total) ||
			payload.total < 0 ||
			!Number.isSafeInteger(payload.pages) ||
			payload.pages < 0 ||
			payload.page !== page ||
			!Number.isSafeInteger(payload.limit) ||
			payload.limit < 1 ||
			payload.limit > PRODUCT_PAGE_SIZE ||
			payload.pages !== Math.ceil(payload.total / payload.limit) ||
			payload.products.length > payload.limit
		) {
			throw new Error('Product API returned an invalid pagination envelope');
		}

		expectedTotal ??= payload.total;
		expectedPages ??= payload.pages;
		if (payload.total !== expectedTotal || payload.pages !== expectedPages) {
			throw new Error('Product API pagination changed during traversal');
		}
		if (payload.pages > MAX_PRODUCT_PAGE_REQUESTS) {
			throw new Error('Product API pagination exceeds the safe traversal limit');
		}

		products.push(...payload.products);
		if (page >= payload.pages) {
			if (products.length !== payload.total) {
				throw new Error('Product API pagination was incomplete');
			}
			return products;
		}
	}

	throw new Error('Product API pagination exceeds the safe traversal limit');
}

export function normalizeProduct(product, locale = 'en') {
	if (!product?.id) {
		return null;
	}

	const regularPrice = Number(product.regular_price);
	const salePrice = Number(product.sale_price);
	const stockQuantity = Number(product.stock_quantity);

	return {
		id: product.id,
		name: resolveLocalizedText(product.name, locale) || null,
		description: resolveLocalizedText(product.description, locale),
		mainImage: resolveImageUrl(product.main_image),
		image: resolveImageUrl(product.main_image),
		categories: Array.isArray(product.categories)
			? product.categories.map((category) => ({
					...category,
					name: resolveLocalizedText(category?.name, locale) || null,
				}))
			: [],
		variants: Array.isArray(product.variants)
			? product.variants.map((variant) => normalizeProduct(variant, locale)).filter(Boolean)
			: [],
		variantOf: product.variant_of ?? null,
		rawRegularPrice: product.regular_price ?? null,
		rawSalePrice: product.sale_price ?? null,
		regularPrice: Number.isFinite(regularPrice) ? regularPrice : null,
		salePrice: Number.isFinite(salePrice) ? salePrice : null,
		published: Boolean(product.published),
		visible: Boolean(product.visible),
		stockQuantity: Number.isFinite(stockQuantity) ? stockQuantity : null,
	};
}

export function normalizeBlog(blog, locale = 'en') {
	if (!blog?.id) {
		return null;
	}

	return {
		id: blog.id,
		slug: blog.slug ?? String(blog.id),
		title: resolveLocalizedText(blog.title, locale) ?? null,
		author: blog.author ?? null,
		blogcontent: resolveLocalizedText(blog.blogcontent, locale) ?? '',
		thumbnailimage: resolveImageUrl(blog.thumbnailimage),
		created_at: blog.created_at ?? null,
		categories: Array.isArray(blog.categories)
			? blog.categories.map((category) => ({
					id: category?.id,
					name: resolveLocalizedText(category?.name, locale) || null,
				}))
			: [],
	};
}

export async function fetchProducts(locale = 'en') {
	const products = await collectProductPages(async (page, limit) => {
		const url = new URL(withLocaleQuery(ENDPOINTS.PRODUCTS, locale));
		url.searchParams.set('page', String(page));
		url.searchParams.set('limit', String(limit));
		const response = await fetch(url, {
			credentials: publicApiCredentials(),
			next: {
				revalidate: CONTENT_REVALIDATE_SECONDS,
				tags: [`products:${locale}`],
			},
			headers: {
				Accept: 'application/json',
			},
			signal: AbortSignal.timeout(CONTENT_FETCH_TIMEOUT_MS),
		});

		if (!response.ok) {
			throw new Error(`Product API failed with status ${response.status}`);
		}
		return response.json();
	});

	const normalized = products.map((product) => normalizeProduct(product, locale));
	if (normalized.some((product) => !product)) throw new Error('Product content could not be loaded');
	return normalized;
}

export async function fetchBlogs(locale = 'en') {
	const response = await fetch(withLocaleQuery(ENDPOINTS.BLOGS, locale), {
		credentials: publicApiCredentials(),
		next: {
			revalidate: CONTENT_REVALIDATE_SECONDS,
			tags: [`blogs:${locale}`],
		},
		headers: {
			Accept: 'application/json',
		},
		signal: AbortSignal.timeout(CONTENT_FETCH_TIMEOUT_MS),
	});

	if (!response.ok) {
		throw new Error(`Blogs API failed with status ${response.status}`);
	}

	const payload = await response.json();
	const blogs = Array.isArray(payload)
		? payload
		: Array.isArray(payload?.blogs)
			? payload.blogs
			: Array.isArray(payload?.data)
				? payload.data
				: null;
	if (!blogs) throw new Error('Blog content could not be loaded');
	const normalized = blogs.map((blog) => normalizeBlog(blog, locale));
	if (normalized.some((blog) => !blog)) throw new Error('Blog content could not be loaded');
	return normalized;
}

export async function fetchCategories(locale = 'en') {
	const response = await fetch(withLocaleQuery(ENDPOINTS.CATEGORIES, locale), {
		credentials: publicApiCredentials(),
		next: {
			revalidate: CONTENT_REVALIDATE_SECONDS,
			tags: [`categories:${locale}`],
		},
		headers: {
			Accept: 'application/json',
		},
		signal: AbortSignal.timeout(CONTENT_FETCH_TIMEOUT_MS),
	});

	if (!response.ok) {
		throw new Error(`Categories API failed with status ${response.status}`);
	}

	const payload = await response.json();

	const categories = Array.isArray(payload)
		? payload
		: Array.isArray(payload?.categories)
			? payload.categories
			: Array.isArray(payload?.data)
				? payload.data
				: Array.isArray(payload?.data?.categories)
					? payload.data.categories
					: null;
	if (!categories || categories.some((category) => !category?.id))
		throw new Error('Category content could not be loaded');

	return categories.map((category) => ({
		...category,
		name: resolveLocalizedText(category?.name, locale) || null,
		description: resolveLocalizedText(category?.description, locale),
	}));
}

async function submitPublicForm(formType, payload, fetchImplementation) {
	let reference;
	try {
		reference = globalThis.crypto.randomUUID();
	} catch {
		throw new FormSubmissionError('rejected', null);
	}
	try {
		const options = withFormSubmissionOptions(formType, payload);
		const { response, payload: result } = await parsePublicJsonResponse(
			await fetchImplementation(ENDPOINTS.FORMS, {
				...options,
				headers: { ...options.headers, 'X-Request-ID': reference },
				signal: AbortSignal.timeout(30000),
			})
		);
		if (
			response.status === 201 &&
			result?.requestId === reference &&
			result?.submitted === true &&
			result.form_type === formType &&
			Number.isSafeInteger(Number(result.id)) &&
			Number(result.id) > 0
		) {
			return { id: Number(result.id), submitted: true, form_type: formType, reference };
		}
		if (
			response.status === 400 &&
			result?.requestId === reference &&
			result?.code === 'FORM_VALIDATION_FAILED' &&
			result.received === false
		) {
			throw new FormSubmissionError(
				'validation',
				reference,
				Array.isArray(result.fieldErrors) ? result.fieldErrors : []
			);
		}
		if (response.status === 429) throw new FormSubmissionError('rate_limited', reference);
		if (response.status === 413) throw new FormSubmissionError('too_large', reference);
		if ([401, 403, 415].includes(response.status)) throw new FormSubmissionError('rejected', reference);
		throw new FormSubmissionError('uncertain', reference);
	} catch (error) {
		if (error instanceof FormSubmissionError) throw error;
		throw new FormSubmissionError('uncertain', reference);
	}
}

export async function submitContactForm(payload, fetchImplementation = fetch) {
	return submitPublicForm('contact', payload, fetchImplementation);
}

export async function submitAppointmentForm(payload, fetchImplementation = fetch) {
	return submitPublicForm('appointment', payload, fetchImplementation);
}

export async function submitPatientIntakeForm(payload, fetchImplementation = fetch) {
	return submitPublicForm('patient_intake', payload, fetchImplementation);
}

export async function submitPrescriptionConsentForm(payload, fetchImplementation = fetch) {
	return submitPublicForm('consent', payload, fetchImplementation);
}

export async function submitCovidScreeningForm(payload, fetchImplementation = fetch) {
	return submitPublicForm('covid_screening', payload, fetchImplementation);
}

export async function validateCoupon(code, fetchImplementation = fetch) {
	const normalizedCode = String(code || '')
		.trim()
		.toUpperCase();
	if (!normalizedCode) {
		throw new Error('Coupon code is required');
	}

	let response;
	try {
		response = await fetchImplementation(`${ENDPOINTS.COUPONS}/validate/${encodeURIComponent(normalizedCode)}`, {
			method: 'POST',
			cache: 'no-store',
			credentials: publicApiCredentials(),
			headers: {
				Accept: 'application/json',
			},
			signal: AbortSignal.timeout(15000),
		});
	} catch {
		throw new PublicApiError('Coupon could not be checked', 0);
	}

	let payload = null;
	try {
		payload = await response.json();
	} catch {
		payload = null;
	}

	if (!response.ok) throw new PublicApiError('Coupon could not be checked', response.status);

	if (payload?.valid) {
		return payload;
	}

	throw new PublicApiError('Coupon could not be checked', 502);
}
