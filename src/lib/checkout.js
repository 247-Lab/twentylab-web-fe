const COMPILED_PUBLIC_CHECKOUT_CONFIG = Object.freeze({
	enabled: process.env.NEXT_PUBLIC_CHECKOUT_ENABLED,
	environment: process.env.NEXT_PUBLIC_AUTHORIZE_NET_ENVIRONMENT,
	apiLoginId: process.env.NEXT_PUBLIC_AUTHORIZE_NET_API_LOGIN_ID,
	clientKey: process.env.NEXT_PUBLIC_AUTHORIZE_NET_CLIENT_KEY,
	scriptUrl:
		process.env.NEXT_PUBLIC_AUTHORIZE_NET_ENVIRONMENT === 'sandbox'
			? 'https://jstest.authorize.net/v3/AcceptUI.js'
			: 'https://js.authorize.net/v3/AcceptUI.js',
});

const AUTHORIZE_NET_ORIGINS = Object.freeze({
	sandbox: 'https://jstest.authorize.net',
	production: 'https://js.authorize.net',
});

export function isPublicCheckoutEnabled(config = COMPILED_PUBLIC_CHECKOUT_CONFIG) {
	return config.enabled === 'true';
}

export function resolvePublicCheckoutConfig(config = COMPILED_PUBLIC_CHECKOUT_CONFIG) {
	if (!isPublicCheckoutEnabled(config)) {
		return Object.freeze({ enabled: false });
	}

	const origin = AUTHORIZE_NET_ORIGINS[config.environment];
	if (!origin) {
		throw new Error('Checkout payment environment is not configured');
	}
	if (typeof config.apiLoginId !== 'string' || !config.apiLoginId.trim()) {
		throw new Error('Checkout API Login ID is not configured');
	}
	if (typeof config.clientKey !== 'string' || !config.clientKey.trim()) {
		throw new Error('Checkout Public Client Key is not configured');
	}

	const scriptUrl = config.scriptUrl || `${origin}/v3/AcceptUI.js`;
	if (scriptUrl !== `${origin}/v3/AcceptUI.js`) {
		throw new Error('Checkout hosted payment script is inconsistent');
	}

	return Object.freeze({
		enabled: true,
		environment: config.environment,
		apiLoginId: config.apiLoginId.trim(),
		clientKey: config.clientKey.trim(),
		scriptUrl,
	});
}

export function checkoutCartItems(items) {
	if (!Array.isArray(items) || items.length === 0) {
		throw new Error('Checkout cart is empty');
	}

	const quantities = new Map();
	for (const item of items) {
		// Variants are separately priced product rows in the backend. Send the
		// selected variant ID, not its display parent's ID, so the authoritative
		// quote matches what the customer selected.
		const selectedId = item?.variantId === null || item?.variantId === undefined ? item?.id : item.variantId;
		const productId = Number(selectedId);
		const quantity = Number(item?.quantity);
		if (!Number.isSafeInteger(productId) || productId < 1) {
			throw new Error('Checkout cart contains an invalid product');
		}
		if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 100) {
			throw new Error('Checkout cart contains an invalid quantity');
		}
		const combined = (quantities.get(productId) || 0) + quantity;
		if (combined > 100) {
			throw new Error('Checkout cart contains an invalid quantity');
		}
		quantities.set(productId, combined);
	}

	return [...quantities.entries()]
		.map(([productId, quantity]) => ({ productId, quantity }))
		.sort((left, right) => left.productId - right.productId);
}

export function buildCheckoutPayload({ form, items, couponId = null }) {
	return {
		firstname: form.firstname,
		lastname: form.lastname,
		country: form.country,
		house_number: form.house_number,
		apartment: form.apartment || null,
		city: form.city,
		countrystate: form.countrystate,
		zipcode: form.zipcode,
		phone: form.phone,
		emailaddress: form.emailaddress,
		appointment_time: form.appointment_time,
		additional_information: form.additional_information || null,
		coupon_id: couponId,
		items: checkoutCartItems(items),
	};
}

export function checkoutReviewFailureKey(error) {
	switch (error?.code) {
		case 'CHECKOUT_PRODUCT_UNAVAILABLE':
			return 'productUnavailable';
		case 'CHECKOUT_COUPON_INVALID':
			return 'couponNoLongerValid';
		case 'CHECKOUT_APPOINTMENT_INVALID':
			return 'appointmentInvalid';
		case 'CHECKOUT_INPUT_INVALID':
			return 'detailsInvalid';
		case 'CHECKOUT_ITEMS_INVALID':
			return 'cartInvalid';
		case 'CHECKOUT_PRICING_CHANGED':
			return 'pricingChanged';
		default:
			if (error?.status === 429) return 'tooManyRequests';
			return error?.status === 503 ? 'checkoutUnavailable' : 'submitError';
	}
}

export function formatCents(value, locale = 'en') {
	if (!Number.isSafeInteger(value)) return '';
	return new Intl.NumberFormat(locale === 'es' ? 'es-US' : 'en-US', {
		style: 'currency',
		currency: 'USD',
	}).format(value / 100);
}

export function validateAcceptUiResponse(response) {
	if (response?.messages?.resultCode === 'Error') {
		return Object.freeze({ outcome: 'tokenization_error' });
	}
	const descriptor = response?.opaqueData?.dataDescriptor;
	const dataValue = response?.opaqueData?.dataValue;
	if (
		descriptor !== 'COMMON.ACCEPT.INAPP.PAYMENT' ||
		typeof dataValue !== 'string' ||
		dataValue.length < 1 ||
		dataValue.length > 2048
	) {
		return Object.freeze({ outcome: 'tokenization_error' });
	}
	return Object.freeze({
		outcome: 'tokenized',
		opaqueData: Object.freeze({ dataDescriptor: descriptor, dataValue }),
	});
}

export function newPaymentAttemptIdempotencyKey(cryptoObject = globalThis.crypto) {
	const value = cryptoObject?.randomUUID?.();
	if (
		typeof value !== 'string' ||
		!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
	) {
		throw new Error('Secure payment attempt identifier is unavailable');
	}
	return value.toLowerCase();
}
