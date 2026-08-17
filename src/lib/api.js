const COMPILED_PUBLIC_API_CONFIG = {
	mode: process.env.NEXT_PUBLIC_MODE,
	devApiUrl: process.env.NEXT_PUBLIC_DEV_API_URL,
	prodApiUrl: process.env.NEXT_PUBLIC_PROD_API_URL,
};

export function resolvePublicApiBase(config = COMPILED_PUBLIC_API_CONFIG) {
	const publicBase = config.mode === 'dev' ? config.devApiUrl : config.prodApiUrl;
	if (!publicBase) throw new Error('Public API origin is not configured');
	return publicBase.replace(/\/$/, '');
}

export function resolveApiOrigin(config) {
	const publicBase = resolvePublicApiBase(config);
	const internalApiUrl = typeof window === 'undefined' ? config?.internalApiUrl || process.env.INTERNAL_API_URL : null;
	const base = internalApiUrl || publicBase;

	if (!base) throw new Error('API origin is not configured');
	return `${base.replace(/\/$/, '')}/api`;
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

async function parseJsonResponse(response) {
	if (!response.ok) {
		throw new Error(`API failed with status ${response.status}`);
	}

	return response.json();
}

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

function withFormSubmissionOptions(formType, payload) {
	return {
		...withJsonOptions({
			...payload,
			form_type: formType,
		}),
		cache: 'no-store',
		credentials: 'omit',
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

export function resolveImageUrl(value, config = COMPILED_PUBLIC_API_CONFIG) {
	if (!value) {
		return '/images/placeholder.png';
	}

	if (value.startsWith('http://') || value.startsWith('https://')) {
		return value;
	}

	if (value.startsWith('//')) {
		return `https:${value}`;
	}

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

	return products.map((product) => normalizeProduct(product, locale)).filter(Boolean);
}

export async function fetchBlogs(locale = 'en') {
	const response = await fetch(withLocaleQuery(ENDPOINTS.BLOGS, locale), {
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
				: [];

	return blogs.map((blog) => normalizeBlog(blog, locale)).filter(Boolean);
}

export async function fetchCategories(locale = 'en') {
	const response = await fetch(withLocaleQuery(ENDPOINTS.CATEGORIES, locale), {
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
					: [];

	return categories.map((category) => ({
		...category,
		name: resolveLocalizedText(category?.name, locale) || null,
		description: resolveLocalizedText(category?.description, locale),
	}));
}

export async function submitContactForm(payload) {
	const response = await fetch(ENDPOINTS.FORMS, withFormSubmissionOptions('contact', payload));
	return parseJsonResponse(response);
}

export async function submitAppointmentForm(payload) {
	const response = await fetch(ENDPOINTS.FORMS, withFormSubmissionOptions('appointment', payload));
	return parseJsonResponse(response);
}

export async function submitPatientIntakeForm(payload) {
	const response = await fetch(ENDPOINTS.FORMS, withFormSubmissionOptions('patient_intake', payload));
	return parseJsonResponse(response);
}

export async function submitPrescriptionConsentForm(payload) {
	const response = await fetch(ENDPOINTS.FORMS, withFormSubmissionOptions('consent', payload));
	return parseJsonResponse(response);
}

export async function submitCovidScreeningForm(payload) {
	const response = await fetch(ENDPOINTS.FORMS, withFormSubmissionOptions('covid_screening', payload));
	return parseJsonResponse(response);
}

export async function validateCoupon(code) {
	const normalizedCode = String(code || '')
		.trim()
		.toUpperCase();
	if (!normalizedCode) {
		throw new Error('Coupon code is required');
	}

	const response = await fetch(`${ENDPOINTS.COUPONS}/validate/${encodeURIComponent(normalizedCode)}`, {
		method: 'POST',
		cache: 'no-store',
		headers: {
			Accept: 'application/json',
		},
	});

	let payload = null;
	try {
		payload = await response.json();
	} catch {
		payload = null;
	}

	if (!response.ok) {
		throw new Error(payload?.error || `API failed with status ${response.status}`);
	}

	if (payload?.valid) {
		return payload;
	}

	throw new Error(payload?.error || 'Invalid or expired coupon code');
}
