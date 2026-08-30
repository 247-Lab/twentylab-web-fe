'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import {
	CART_STORAGE_KEY,
	MAX_CART_ITEM_QUANTITY,
	makeCartItem,
	normalizeCart,
	readCartFromStorage,
	saveCartToStorage,
} from '@/lib/cart';

const CartContext = createContext(null);

const initialCartState = {
	items: [],
	subtotal: 0,
	itemCount: 0,
};

function cartReducer(state, action) {
	switch (action.type) {
		case 'hydrate': {
			const next = normalizeCart(action.payload);
			return JSON.stringify(next.items) === JSON.stringify(state.items) ? state : next;
		}
		case 'add': {
			const nextItem = makeCartItem(action.payload.product, action.payload.options);
			if (!nextItem) {
				return state;
			}

			const index = state.items.findIndex((item) => item.key === nextItem.key);
			if (index === -1) {
				return normalizeCart({ items: [...state.items, nextItem] });
			}

			const items = state.items.map((item, currentIndex) =>
				currentIndex === index ? { ...item, quantity: item.quantity + nextItem.quantity } : item
			);
			return normalizeCart({ items });
		}
		case 'remove': {
			const items = state.items.filter((item) => item.key !== action.payload.key);
			return normalizeCart({ items });
		}
		case 'set-quantity': {
			const quantity = Math.min(MAX_CART_ITEM_QUANTITY, Math.max(1, Number(action.payload.quantity) || 1));
			const items = state.items.map((item) => (item.key === action.payload.key ? { ...item, quantity } : item));
			return normalizeCart({ items });
		}
		case 'clear': {
			return initialCartState;
		}
		default: {
			return state;
		}
	}
}

export function CartProvider({ children }) {
	const [state, dispatch] = useReducer(cartReducer, initialCartState);
	const [persistenceError, setPersistenceError] = useState(false);
	const stateRef = useRef(initialCartState);

	useEffect(() => {
		let active = true;
		const syncFromStorage = () => {
			if (!active) return;
			const read = readCartFromStorage();
			if (!read.readable) {
				setPersistenceError(true);
				return;
			}
			const next = read.cart;
			stateRef.current = next;
			dispatch({ type: 'hydrate', payload: next });
			setPersistenceError(false);
		};
		// Read browser storage after hydration so a saved client cart cannot cause
		// a server/client render mismatch.
		queueMicrotask(syncFromStorage);
		const onStorage = (event) => {
			if (event.key !== CART_STORAGE_KEY && event.key !== null) return;
			syncFromStorage();
		};
		const onVisibilityChange = () => {
			if (document.visibilityState === 'visible') syncFromStorage();
		};
		window.addEventListener('storage', onStorage);
		window.addEventListener('focus', syncFromStorage);
		document.addEventListener('visibilitychange', onVisibilityChange);
		return () => {
			active = false;
			window.removeEventListener('storage', onStorage);
			window.removeEventListener('focus', syncFromStorage);
			document.removeEventListener('visibilitychange', onVisibilityChange);
		};
	}, []);

	const applyCartAction = useCallback((action) => {
		const next = cartReducer(stateRef.current, action);
		if (next === stateRef.current) {
			// A previous clear can update the visible state even when browser
			// storage rejected the write. A later retry must still prove the paid
			// cart was removed before checkout can release its payment reference.
			if (action.type !== 'clear') return true;
			const saved = saveCartToStorage(next);
			setPersistenceError(!saved);
			return saved;
		}
		stateRef.current = next;
		// Commit the exact state calculated from the latest storage snapshot.
		// Replaying the action against React's potentially older render state can
		// otherwise lose a cross-tab update that arrived just before this click.
		dispatch({ type: 'hydrate', payload: next });
		const saved = saveCartToStorage(next);
		setPersistenceError(!saved);
		return saved;
	}, []);

	const value = useMemo(() => {
		return {
			cart: state,
			cartPersistenceError: persistenceError,
			dismissCartPersistenceError: () => setPersistenceError(false),
			addToCart: (product, options = {}) => {
				if (!makeCartItem(product, options)) return false;
				applyCartAction({ type: 'add', payload: { product, options } });
				return true;
			},
			removeFromCart: (key) => applyCartAction({ type: 'remove', payload: { key } }),
			setQuantity: (key, quantity) => applyCartAction({ type: 'set-quantity', payload: { key, quantity } }),
			clearCart: () => applyCartAction({ type: 'clear' }),
		};
	}, [applyCartAction, persistenceError, state]);

	return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
	const context = useContext(CartContext);
	if (!context) {
		throw new Error('useCart must be used inside CartProvider');
	}

	return context;
}
