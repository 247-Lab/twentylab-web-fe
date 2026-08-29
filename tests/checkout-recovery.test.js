import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
	CHECKOUT_RECOVERY_KEY,
	clearCheckoutRecovery,
	readCheckoutRecovery,
	retainSuccessfulCheckoutRecovery,
	settleCheckoutRecovery,
	saveCheckoutRecovery,
	withCheckoutLock,
} from '../src/lib/checkoutRecovery';

const ticket = { reference: 'PAY-17', statusToken: `status-v1.17.1800000000.${'a'.repeat(43)}.${'b'.repeat(43)}` };
let store;
beforeEach(() => {
	const data = new Map();
	store = {
		getItem: (key) => data.get(key) ?? null,
		setItem: (key, value) => data.set(key, value),
		removeItem: (key) => data.delete(key),
	};
});

describe('unconfirmed checkout recovery', () => {
	it('preserves a status-only receipt across reload and expiry without payment or customer data', () => {
		saveCheckoutRecovery(
			{ ...ticket, checkoutToken: 'secret', email: 'private@example.test', opaqueData: 'card-nonce' },
			store
		);
		expect(readCheckoutRecovery(store)).toEqual(ticket);
		expect(JSON.parse(store.getItem(CHECKOUT_RECOVERY_KEY))).toEqual(ticket);
		vi.setSystemTime(new Date('2099-01-01'));
		expect(readCheckoutRecovery(store)).toEqual(ticket);
		vi.useRealTimers();
	});
	it('keeps missing or damaged evidence blocked, rather than silently discarding it', () => {
		expect(readCheckoutRecovery(store)).toBeNull();
		store.setItem(CHECKOUT_RECOVERY_KEY, '{bad');
		expect(readCheckoutRecovery(store)).toEqual({ unavailable: true });
		expect(
			readCheckoutRecovery({
				getItem() {
					throw new Error();
				},
			})
		).toEqual({ unavailable: true });
		expect(readCheckoutRecovery(null)).toEqual({ unavailable: true });
	});
	it('clears only the exact saved status ticket', () => {
		saveCheckoutRecovery(ticket, store);
		expect(() =>
			clearCheckoutRecovery({ ...ticket, statusToken: ticket.statusToken.replace(/b$/, 'c') }, store)
		).toThrow();
		expect(readCheckoutRecovery(store)).toEqual(ticket);
		clearCheckoutRecovery(ticket, store);
		expect(readCheckoutRecovery(store)).toBeNull();
	});
	it('does not let storage cleanup hide an authoritative terminal result', () => {
		saveCheckoutRecovery(ticket, store);
		const unavailableRemoval = {
			...store,
			removeItem() {
				throw new Error('storage unavailable');
			},
		};
		expect(settleCheckoutRecovery(ticket, unavailableRemoval)).toEqual(ticket);

		clearCheckoutRecovery(ticket, store);
		expect(settleCheckoutRecovery(ticket, store)).toBeNull();
	});
	it('retains successful evidence until the customer explicitly starts another order', () => {
		saveCheckoutRecovery(ticket, store);
		expect(retainSuccessfulCheckoutRecovery(ticket, store)).toEqual(ticket);
		expect(readCheckoutRecovery(store)).toEqual(ticket);
	});
	it('does not accept a different saved payment reference as the completed one', () => {
		const nextTicket = {
			reference: 'PAY-18',
			statusToken: `status-v1.18.1800000000.${'c'.repeat(43)}.${'d'.repeat(43)}`,
		};
		saveCheckoutRecovery(ticket, store);
		saveCheckoutRecovery(nextTicket, store);
		expect(retainSuccessfulCheckoutRecovery(ticket, store)).toEqual({ unavailable: true });
		expect(readCheckoutRecovery(store)).toEqual(nextTicket);
	});
	it('does not start a second payment in another tab or a browser without safe locking', async () => {
		const pay = vi.fn();
		const locks = { request: vi.fn(async (_name, _options, run) => run(null)) };
		await expect(withCheckoutLock(pay, locks)).rejects.toThrow();
		await expect(withCheckoutLock(pay, null)).rejects.toThrow();
		expect(pay).not.toHaveBeenCalled();
	});
});
