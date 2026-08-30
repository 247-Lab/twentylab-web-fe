import { validRecoveryTicket } from './checkoutRecovery';
import { FormSubmissionError } from './formFeedback';
import { normalizeBlogSlug } from './blogRoutes';

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
	constructor(message, status, code = null) {
		super(message);
		this.name = 'PublicApiError';
		this.status = status;
		this.code = typeof code === 'string' && /^[A-Z][A-Z0-9_]{2,63}$/.test(code) ? code : null;
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
		throw new PublicApiError(
			responsePayload?.error || 'Checkout is temporarily unavailable',
			response.status,
			responsePayload?.code
		);
	}
	const data = responsePayload?.data;
	const requestedItems = Array.isArray(payload?.items) ? payload.items : [];
	const validRequestedItems =
		requestedItems.length >= 1 &&
		requestedItems.every(
			(item) =>
				Number.isSafeInteger(item?.productId) &&
				item.productId > 0 &&
				Number.isSafeInteger(item?.quantity) &&
				item.quantity >= 1 &&
				item.quantity <= 100
		) &&
		new Set(requestedItems.map((item) => item.productId)).size === requestedItems.length;
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
	const returnedSelection = validItems
		? data.items
				.map(({ productId, quantity }) => ({ productId, quantity }))
				.sort((left, right) => left.productId - right.productId)
		: [];
	const requestedSelection = validRequestedItems
		? requestedItems
				.map(({ productId, quantity }) => ({ productId, quantity }))
				.sort((left, right) => left.productId - right.productId)
		: [];
	const selectionMatches =
		validRequestedItems &&
		returnedSelection.length === requestedSelection.length &&
		returnedSelection.every(
			(item, index) =>
				item.productId === requestedSelection[index].productId && item.quantity === requestedSelection[index].quantity
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
		!selectionMatches ||
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
		!['succeeded', 'declined', 'not_started', 'confirmation_required'].includes(data.outcome) ||
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
	if (typeof value !== 'string' || !value.trim()) {
		return '/images/placeholder.png';
	}
	value = value.trim();

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
	const seenProductIds = new Set();
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

		for (const product of payload.products) {
			const id = Number(product?.id);
			if (!Number.isSafeInteger(id) || id < 1 || seenProductIds.has(id)) {
				throw new Error('Product API pagination returned a duplicate or invalid product');
			}
			seenProductIds.add(id);
			products.push(product);
		}
		if (page >= payload.pages) {
			if (products.length !== payload.total) {
				throw new Error('Product API pagination was incomplete');
			}
			return products;
		}
	}

	throw new Error('Product API pagination exceeds the safe traversal limit');
}

function normalizedPublicPrice(value, { optional = false } = {}) {
	if (optional && (value === null || value === undefined)) {
		return { valid: true, value: null };
	}
	if ((typeof value !== 'string' && typeof value !== 'number') || String(value).trim() === '') {
		return { valid: false, value: null };
	}
	const numeric = Number(value);
	if (!Number.isFinite(numeric) || numeric < 0 || numeric > 99_999_999.99) {
		return { valid: false, value: null };
	}
	return { valid: true, value: numeric };
}

function normalizedContentCategory(category, locale) {
	const id = Number(category?.id);
	const name = resolveLocalizedText(category?.name, locale).trim();
	if (!Number.isSafeInteger(id) || id < 1 || !name) return null;
	return { ...category, id, name };
}

function hasUniquePositiveIds(rows, { excludedId } = {}) {
	if (!Array.isArray(rows)) return false;
	const ids = rows.map((row) => Number(row?.id));
	return ids.every((id) => Number.isSafeInteger(id) && id > 0 && id !== excludedId) && new Set(ids).size === ids.length;
}

export function normalizeProduct(product, locale = 'en', { variant = false } = {}) {
	if (!product || typeof product !== 'object' || Array.isArray(product)) return null;
	const id = Number(product?.id);
	const name = resolveLocalizedText(product.name, locale).trim();
	const regularPrice = normalizedPublicPrice(product.regular_price);
	const salePrice = normalizedPublicPrice(product.sale_price, { optional: true });
	if (
		!Number.isSafeInteger(id) ||
		id < 1 ||
		!name ||
		!regularPrice.valid ||
		(variant && regularPrice.value <= 0) ||
		!salePrice.valid ||
		(salePrice.value !== null && salePrice.value > regularPrice.value)
	) {
		return null;
	}

	if (product.categories !== undefined && !Array.isArray(product.categories)) return null;
	if (product.variants !== undefined && !Array.isArray(product.variants)) return null;
	const categories = (product.categories || []).map((category) => normalizedContentCategory(category, locale));
	const variants = Array.isArray(product.variants)
		? product.variants.map((entry) => normalizeProduct(entry, locale, { variant: true }))
		: [];
	const stockQuantity = Number(product.stock_quantity);
	const hasStockQuantity = product.stock_quantity !== undefined && product.stock_quantity !== null;
	const stockQuantityIsValid =
		(!hasStockQuantity && variant) || (hasStockQuantity && Number.isSafeInteger(stockQuantity) && stockQuantity >= 0);
	const visibilityIsValid = variant
		? (product.published === undefined || product.published === true) &&
			(product.visible === undefined || product.visible === true)
		: product.published === true && product.visible === true;
	const parentReferenceIsValid = variant
		? product.variant_of === undefined ||
			product.variant_of === null ||
			(Number.isSafeInteger(Number(product.variant_of)) && Number(product.variant_of) > 0)
		: product.variant_of === null || product.variant_of === undefined;
	const hasCheckoutPrice = regularPrice.value > 0 || (!variant && variants.length > 0);
	// Do not silently publish a partially normalized product. Missing category or
	// variant identifiers are a content/API failure, not permission to hide the
	// affected relationship from customers.
	if (
		categories.some((category) => !category) ||
		variants.some((entry) => !entry) ||
		!hasUniquePositiveIds(categories) ||
		!hasUniquePositiveIds(variants, { excludedId: id }) ||
		!stockQuantityIsValid ||
		!visibilityIsValid ||
		!parentReferenceIsValid ||
		!hasCheckoutPrice
	) {
		return null;
	}

	return {
		id,
		name,
		description: resolveLocalizedText(product.description, locale),
		mainImage: resolveImageUrl(product.main_image),
		image: resolveImageUrl(product.main_image),
		categories,
		variants,
		variantOf:
			Number.isSafeInteger(Number(product.variant_of)) && Number(product.variant_of) > 0
				? Number(product.variant_of)
				: null,
		rawRegularPrice: product.regular_price,
		rawSalePrice: product.sale_price ?? null,
		regularPrice: regularPrice.value,
		salePrice: salePrice.value === 0 ? null : salePrice.value,
		published: variant ? (product.published ?? true) : true,
		visible: variant ? (product.visible ?? true) : true,
		stockQuantity: hasStockQuantity ? stockQuantity : null,
	};
}

export function normalizeBlog(blog, locale = 'en') {
	if (!blog || typeof blog !== 'object' || Array.isArray(blog)) return null;
	const id = Number(blog?.id);
	const title = resolveLocalizedText(blog.title, locale).trim();
	const blogcontent = resolveLocalizedText(blog.blogcontent, locale);
	let slug;
	try {
		slug = normalizeBlogSlug(blog.slug);
	} catch {
		return null;
	}
	if (
		!Number.isSafeInteger(id) ||
		id < 1 ||
		!title ||
		!blogcontent.trim() ||
		blog.isactive !== true ||
		!Number.isFinite(Date.parse(blog.created_at))
	) {
		return null;
	}
	if (blog.categories !== undefined && !Array.isArray(blog.categories)) return null;
	const categories = (blog.categories || []).map((category) => normalizedContentCategory(category, locale));
	// A category without an identifier cannot be linked, filtered, or keyed
	// reliably. Reject the affected post instead of publishing a partial view
	// that silently drops or misroutes its category relationship.
	if (categories.some((category) => !category) || !hasUniquePositiveIds(categories)) {
		return null;
	}

	return {
		id,
		slug,
		title,
		author: resolveLocalizedText(blog.author, locale) || null,
		blogcontent,
		thumbnailimage: resolveImageUrl(blog.thumbnailimage),
		created_at: blog.created_at ?? null,
		categories,
	};
}

export function normalizeBlogList(blogs, locale = 'en') {
	if (!Array.isArray(blogs)) throw new Error('Blog content could not be loaded');
	const normalized = blogs.map((blog) => normalizeBlog(blog, locale));
	if (
		normalized.some((blog) => !blog) ||
		!hasUniquePositiveIds(normalized) ||
		new Set(normalized.map((blog) => blog.slug)).size !== normalized.length
	) {
		throw new Error('Blog content could not be loaded');
	}
	return normalized;
}

export function normalizeCategoryList(categories, locale = 'en') {
	if (
		!Array.isArray(categories) ||
		categories.some((category) => {
			const id = Number(category?.id);
			const name = resolveLocalizedText(category?.name, locale).trim();
			return !Number.isSafeInteger(id) || id < 1 || !name;
		}) ||
		!hasUniquePositiveIds(categories)
	) {
		throw new Error('Category content could not be loaded');
	}

	return categories.map((category) => ({
		...category,
		id: Number(category.id),
		name: resolveLocalizedText(category?.name, locale).trim(),
		description: resolveLocalizedText(category?.description, locale),
		main_image: resolveImageUrl(category?.main_image),
	}));
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
	return normalizeBlogList(blogs, locale);
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
	return normalizeCategoryList(categories, locale);
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

	const id = Number(payload?.id);
	const discount = Number(payload?.discount);
	const returnedCode = typeof payload?.code === 'string' ? payload.code.trim().toUpperCase() : '';
	if (
		payload?.valid === true &&
		Number.isSafeInteger(id) &&
		id > 0 &&
		/^[A-Z0-9_-]{1,10}$/.test(returnedCode) &&
		returnedCode === normalizedCode &&
		Number.isSafeInteger(discount) &&
		discount >= 1 &&
		discount <= 99
	) {
		return Object.freeze({ valid: true, id, code: returnedCode, discount });
	}

	throw new PublicApiError('Coupon could not be checked', 502);
}
