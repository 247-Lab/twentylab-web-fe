'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { TriangleAlert } from 'lucide-react';
import { useCart } from '@/components/cart/CartProvider';

export default function CheckoutPage() {
	const t = useTranslations('CheckoutPage');
	const { cart } = useCart();
	const selectionCount = cart.items.reduce((count, item) => count + Number(item.quantity || 0), 0);

	return (
		<main className="min-h-screen bg-[linear-gradient(180deg,#eef6ff_0%,#ffffff_40%,#f7fbff_100%)] px-4 py-12">
			<section className="mx-auto w-full max-w-2xl rounded-[2rem] border border-amber-200 bg-white p-8 text-center shadow-[0_30px_70px_-52px_rgba(2,6,14,0.7)]">
				<TriangleAlert className="mx-auto h-10 w-10 text-amber-600" aria-hidden="true" />
				<h1 className="font-display mt-4 text-3xl font-black text-[var(--tl-metallic-black)]">
					{t('unavailableTitle')}
				</h1>
				<p className="mt-3 text-slate-700">{t('unavailableMessage')}</p>
				<p className="mt-3 text-sm text-slate-600">{t('selectionStatus', { count: selectionCount })}</p>
				<div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
					<Link
						href="/contact"
						className="inline-flex items-center justify-center rounded-full bg-[var(--tl-primary)] px-6 py-3 text-sm font-bold text-white transition hover:bg-[var(--tl-primary-strong)]"
					>
						{t('contactLabs')}
					</Link>
					<Link
						href="/testing-services"
						className="inline-flex items-center justify-center rounded-full border border-sky-200 bg-white px-6 py-3 text-sm font-bold text-[var(--tl-primary-strong)] transition hover:bg-sky-50"
					>
						{t('returnToServices')}
					</Link>
				</div>
			</section>
		</main>
	);
}
