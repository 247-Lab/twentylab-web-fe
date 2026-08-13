import { isPracticalEmail } from './validationConstraints';

export const inputClassName =
	'mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm transition outline-none focus:border-[var(--tl-primary)] focus:ring-2 focus:ring-[var(--tl-primary)]/15';

export function safeT(t, key, fallback = '', values) {
	try {
		return values === undefined ? t(key) : t(key, values);
	} catch {
		return fallback;
	}
}

export function safeRaw(t, key, fallback = null) {
	try {
		return t.raw(key);
	} catch {
		return fallback;
	}
}

export function normalizeDateOnly(value) {
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ''));
	if (!match) return null;

	const [, year, month, day] = match;
	const parsed = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
	if (
		parsed.getUTCFullYear() !== Number(year) ||
		parsed.getUTCMonth() !== Number(month) - 1 ||
		parsed.getUTCDate() !== Number(day)
	) {
		return null;
	}

	return `${year}-${month}-${day}`;
}

export function isEmail(value) {
	return isPracticalEmail(value);
}

export function normalizePhone(value) {
	return String(value ?? '').replace(/\D/g, '');
}
