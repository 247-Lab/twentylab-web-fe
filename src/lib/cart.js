const CART_STORAGE_KEY = 'twentylab.cart.v1';
const MAX_CART_ITEM_QUANTITY = 100;

function toNumber(value) {
	const numeric = Number(value);
	return Number.isFinite(numeric) ? numeric : null;
}

function toCartId(value) {
	const id = Number(value);
	return Number.isSafeInteger(id) && id > 0 ? String(id) : null;
}

function toCartQuantity(value) {
	const quantity = Number(value);
	return Number.isSafeInteger(quantity) && quantity >= 1 ? Math.min(quantity, MAX_CART_ITEM_QUANTITY) : 1;
}

function toOptionalText(value) {
	return typeof value === 'string' && value.trim() ? value : null;
}

export function getItemPrice(item) {
	const salePrice = toNumber(item?.salePrice ?? item?.sale_price);
	const regularPrice = toNumber(item?.regularPrice ?? item?.regular_price);

	if (salePrice !== null && salePrice > 0) {
		return salePrice;
	}

	if (regularPrice !== null && regularPrice > 0) {
		return regularPrice;
	}

	return null;
}

export function makeCartItem(product, options = {}) {
	const id = toCartId(product?.id);
	if (!id) {
		return null;
	}

	const quantity = toCartQuantity(options.quantity);
	const variantId = toCartId(options.variantId);
	const variantLabel = toOptionalText(options.variantLabel);
	const price = getItemPrice(product);
	if (price === null) {
		return null;
	}
	const image = toOptionalText(product.mainImage) || toOptionalText(product.image) || '/images/placeholder.png';

	return {
		id,
		variantId,
		key: variantId ? `${id}:${variantId}` : id,
		name: toOptionalText(product.name) || `Product ${id}`,
		price,
		quantity,
		image,
		variantLabel,
	};
}

export function normalizeCart(rawCart) {
	const normalizedItems = Array.isArray(rawCart?.items)
		? rawCart.items
				.map((item) => {
					const id = toCartId(item?.id);
					if (!id) {
						return null;
					}

					const quantity = toCartQuantity(item.quantity);
					const rawPrice = toNumber(item.price);
					const price = rawPrice !== null && rawPrice > 0 ? rawPrice : null;
					const variantId = toCartId(item.variantId);

					return {
						id,
						variantId,
						key: variantId ? `${id}:${variantId}` : id,
						name: toOptionalText(item.name) || `Product ${id}`,
						price,
						quantity,
						image: toOptionalText(item.image) || '/images/placeholder.png',
						variantLabel: toOptionalText(item.variantLabel),
					};
				})
				.filter((item) => item && item.price !== null)
		: [];
	const items = [];
	const itemIndexes = new Map();
	for (const item of normalizedItems) {
		const existingIndex = itemIndexes.get(item.key);
		if (existingIndex === undefined) {
			itemIndexes.set(item.key, items.length);
			items.push(item);
			continue;
		}
		items[existingIndex] = {
			...items[existingIndex],
			quantity: Math.min(MAX_CART_ITEM_QUANTITY, items[existingIndex].quantity + item.quantity),
		};
	}

	const subtotal = items.reduce((total, item) => {
		return total + (item.price || 0) * item.quantity;
	}, 0);
	const itemCount = items.reduce((total, item) => total + item.quantity, 0);

	return {
		items,
		subtotal,
		itemCount,
	};
}

export function readCartFromStorage(storage) {
	let targetStorage = storage;
	if (targetStorage === undefined) {
		try {
			targetStorage = typeof window === 'undefined' ? null : window.localStorage;
		} catch {
			return { cart: normalizeCart({ items: [] }), readable: false };
		}
	}
	if (!targetStorage) {
		return { cart: normalizeCart({ items: [] }), readable: false };
	}

	try {
		const value = targetStorage.getItem(CART_STORAGE_KEY);
		if (!value) {
			return { cart: normalizeCart({ items: [] }), readable: true };
		}

		const parsed = JSON.parse(value);
		const rawItems = parsed?.items;
		const structurallySafe =
			Array.isArray(rawItems) &&
			rawItems.every((item) => {
				const id = toCartId(item?.id);
				const variantId = item?.variantId == null ? null : toCartId(item.variantId);
				const quantity = Number(item?.quantity);
				const price = toNumber(item?.price);
				return (
					id !== null &&
					(item?.variantId == null || variantId !== null) &&
					Number.isSafeInteger(quantity) &&
					quantity >= 1 &&
					quantity <= MAX_CART_ITEM_QUANTITY &&
					price !== null &&
					price > 0
				);
			});
		return { cart: normalizeCart(parsed), readable: structurallySafe };
	} catch {
		return { cart: normalizeCart({ items: [] }), readable: false };
	}
}

export function loadCartFromStorage() {
	return readCartFromStorage().cart;
}

export function saveCartToStorage(cart) {
	if (typeof window === 'undefined') {
		return false;
	}

	try {
		window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify({ items: cart.items }));
		return true;
	} catch {
		return false;
	}
}

export { CART_STORAGE_KEY, MAX_CART_ITEM_QUANTITY };
