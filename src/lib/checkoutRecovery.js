export const CHECKOUT_RECOVERY_KEY = '24-7labs:unconfirmed-payment:v1';
const LOCK_NAME = '24-7labs:checkout-payment:v1';
const STATUS_TOKEN = /^status-v1\.([1-9][0-9]{0,18})\.[0-9]{10}\.[A-Za-z0-9_-]{43}\.[A-Za-z0-9_-]{43}$/;

export function validRecoveryTicket(value) {
	const match = typeof value?.statusToken === 'string' && STATUS_TOKEN.exec(value.statusToken);
	return Boolean(match && value.reference === `PAY-${match[1]}`);
}

function availableStorage(storage) {
	if (storage !== undefined) return storage;
	try {
		return globalThis.localStorage;
	} catch {
		return null;
	}
}

export function readCheckoutRecovery(storage) {
	try {
		const target = availableStorage(storage);
		if (!target?.getItem) return { unavailable: true };
		const raw = target.getItem(CHECKOUT_RECOVERY_KEY);
		if (raw === null) return null;
		const value = JSON.parse(raw);
		if (!validRecoveryTicket(value)) return { unavailable: true };
		return { statusToken: value.statusToken, reference: value.reference };
	} catch {
		return { unavailable: true };
	}
}

export function saveCheckoutRecovery(ticket, storage) {
	if (!validRecoveryTicket(ticket)) throw new Error('Status reference is unavailable');
	const target = availableStorage(storage);
	if (!target?.setItem) throw new Error('Status reference could not be saved');
	// Only the limited read-only ticket and non-medical reference survive reloads.
	target.setItem(
		CHECKOUT_RECOVERY_KEY,
		JSON.stringify({ statusToken: ticket.statusToken, reference: ticket.reference })
	);
	if (readCheckoutRecovery(target)?.statusToken !== ticket.statusToken)
		throw new Error('Status reference could not be saved');
}

export function clearCheckoutRecovery(ticket, storage) {
	const target = availableStorage(storage);
	if (!target?.removeItem || readCheckoutRecovery(target)?.statusToken !== ticket.statusToken)
		throw new Error('Status reference changed');
	target.removeItem(CHECKOUT_RECOVERY_KEY);
	if (readCheckoutRecovery(target) !== null) throw new Error('Status reference could not be cleared');
}

// A confirmed provider result remains authoritative even if this browser can no
// longer remove its saved status ticket. Return any remaining evidence so a
// declined attempt cannot unlock a second payment while another attempt is
// still present.
export function settleCheckoutRecovery(ticket, storage) {
	try {
		clearCheckoutRecovery(ticket, storage);
		return null;
	} catch {
		return readCheckoutRecovery(storage);
	}
}

// Keep a confirmed success visible across reloads and suspended tabs. It is
// cleared only when the customer explicitly starts a new order after seeing the
// confirmed result; an arbitrary timer cannot prove every tab discarded its old
// cart.
export function retainSuccessfulCheckoutRecovery(ticket, storage) {
	if (!validRecoveryTicket(ticket)) throw new Error('Status reference is unavailable');
	const retained = readCheckoutRecovery(storage);
	return retained?.statusToken === ticket.statusToken ? retained : { unavailable: true };
}

export async function withCheckoutLock(run, locks) {
	let target = locks;
	if (target === undefined) {
		try {
			target = globalThis.navigator?.locks;
		} catch {
			target = null;
		}
	}
	if (!target?.request) throw new Error('Safe payment locking is unavailable');
	return target.request(LOCK_NAME, { ifAvailable: true }, async (lock) => {
		if (!lock) throw new Error('Another payment or status check is in progress');
		return run();
	});
}
