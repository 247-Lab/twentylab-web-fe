'use client';

import { useTranslations } from 'next-intl';
import { TriangleAlert, X } from 'lucide-react';
import { useCart } from '@/components/cart/CartProvider';

export default function CartPersistenceAlert() {
	const t = useTranslations('CartPersistenceAlert');
	const { cartPersistenceError, dismissCartPersistenceError } = useCart();

	if (!cartPersistenceError) return null;

	return (
		<div
			role="alert"
			className="fixed right-4 bottom-4 left-4 z-[100] mx-auto flex max-w-2xl items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950 shadow-xl"
		>
			<TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" aria-hidden="true" />
			<p className="flex-1 font-semibold">{t('message')}</p>
			<button
				type="button"
				onClick={dismissCartPersistenceError}
				className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-amber-900 hover:bg-amber-100"
				aria-label={t('dismiss')}
			>
				<X className="h-4 w-4" aria-hidden="true" />
			</button>
		</div>
	);
}
