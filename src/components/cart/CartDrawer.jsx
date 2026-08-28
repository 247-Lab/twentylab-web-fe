'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Minus, Plus, ShoppingCart, Trash2, X } from 'lucide-react';
import { useEffect } from 'react';
import { useCart } from '@/components/cart/CartProvider';
import { isPublicCheckoutEnabled } from '@/lib/checkout';

export default function CartDrawer({ open, onClose }) {
	const t = useTranslations('CartDrawer');
	const { cart, removeFromCart, setQuantity } = useCart();
	const checkoutEnabled = isPublicCheckoutEnabled();

	useEffect(() => {
		if (!open) {
			return undefined;
		}

		const previousBodyOverflow = document.body.style.overflow;
		document.body.style.overflow = 'hidden';

		return () => {
			document.body.style.overflow = previousBodyOverflow;
		};
	}, [open]);

	if (!open) {
		return null;
	}

	return (
		<>
			<div
				className="pointer-events-auto fixed inset-0 z-[70] bg-slate-900/45 opacity-100 transition"
				onClick={onClose}
				aria-hidden="true"
			/>
			<aside
				className="fixed top-0 right-0 z-[80] flex h-dvh w-full max-w-[460px] flex-col overscroll-contain border-l border-slate-200 bg-[linear-gradient(180deg,#f7fbff_0%,#ffffff_50%,#ffffff_100%)] shadow-[-18px_0_50px_-35px_rgba(2,6,14,0.9)]"
				aria-label={t('title')}
			>
				<header className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
					<div className="flex items-center gap-2">
						<div className="rounded-full bg-sky-100 p-2 text-[var(--tl-primary)]">
							<ShoppingCart className="h-4 w-4" />
						</div>
						<div>
							<h2 className="font-display text-lg font-black text-[var(--tl-metallic-black)]">{t('title')}</h2>
							<p className="text-xs font-semibold text-slate-500">{t('itemCount', { count: cart.itemCount })}</p>
						</div>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:border-[var(--tl-primary)] hover:text-[var(--tl-primary)]"
						aria-label={t('close')}
					>
						<X className="h-4 w-4" />
					</button>
				</header>

				<div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">
					{cart.items.length === 0 ? (
						<div className="rounded-2xl border border-dashed border-sky-200 bg-white p-6 text-center">
							<p className="font-semibold text-slate-700">{t('emptyTitle')}</p>
							<p className="mt-1 text-sm text-slate-500">{t('emptyBody')}</p>
							<Link
								href="/testing-services"
								onClick={onClose}
								className="mt-4 inline-flex rounded-full bg-[var(--tl-primary)] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[var(--tl-primary-strong)]"
							>
								{t('browseTests')}
							</Link>
						</div>
					) : (
						<ul className="space-y-3">
							{cart.items.map((item) => {
								return (
									<li
										key={item.key}
										className="rounded-2xl border border-sky-100 bg-white p-3 shadow-[0_14px_28px_-24px_rgba(2,6,14,0.75)]"
									>
										<div className="grid grid-cols-[76px_1fr] gap-3">
											<div className="relative h-[76px] w-[76px] overflow-hidden rounded-xl bg-slate-100">
												<Image src={item.image} alt={item.name} fill className="object-cover" sizes="76px" />
											</div>
											<div className="min-w-0">
												<h3 className="truncate text-sm font-bold text-[var(--tl-metallic-black)]">{item.name}</h3>
												{item.variantLabel ? (
													<p className="mt-0.5 truncate text-xs font-semibold text-slate-500">{item.variantLabel}</p>
												) : null}
												<p className="mt-1 text-xs font-semibold text-slate-500">
													{t('quantity', { count: item.quantity })}
												</p>
											</div>
										</div>

										<div className="mt-3 flex items-center justify-between gap-3">
											<div className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-1.5 py-1">
												<button
													type="button"
													onClick={() => setQuantity(item.key, Math.max(1, item.quantity - 1))}
													className="inline-flex h-7 w-7 items-center justify-center rounded-full text-slate-700 transition hover:bg-white hover:text-[var(--tl-primary)]"
													aria-label={t('decrease')}
												>
													<Minus className="h-3.5 w-3.5" />
												</button>
												<span className="w-8 text-center text-sm font-bold text-slate-800">{item.quantity}</span>
												<button
													type="button"
													onClick={() => setQuantity(item.key, item.quantity + 1)}
													className="inline-flex h-7 w-7 items-center justify-center rounded-full text-slate-700 transition hover:bg-white hover:text-[var(--tl-primary)]"
													aria-label={t('increase')}
												>
													<Plus className="h-3.5 w-3.5" />
												</button>
											</div>

											<button
												type="button"
												onClick={() => removeFromCart(item.key)}
												className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 transition hover:border-rose-300 hover:bg-rose-100"
											>
												<Trash2 className="h-3.5 w-3.5" />
												{t('remove')}
											</button>
										</div>
									</li>
								);
							})}
						</ul>
					)}
				</div>

				{cart.items.length > 0 ? (
					<footer className="border-t border-slate-200 bg-white/90 px-5 py-4">
						{checkoutEnabled ? null : (
							<div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
								{t('unavailableNotice')}
							</div>
						)}
						<div className="grid gap-2 sm:grid-cols-2">
							{checkoutEnabled ? (
								<Link
									href="/checkout"
									onClick={onClose}
									className="inline-flex items-center justify-center rounded-full bg-[var(--tl-primary)] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[var(--tl-primary-strong)]"
								>
									{t('checkout')}
								</Link>
							) : (
								<Link
									href="/contact"
									onClick={onClose}
									className="inline-flex items-center justify-center rounded-full bg-[var(--tl-primary)] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[var(--tl-primary-strong)]"
								>
									{t('contactLabs')}
								</Link>
							)}
							<button
								type="button"
								onClick={onClose}
								className="inline-flex items-center justify-center rounded-full border border-sky-200 bg-white px-4 py-2.5 text-sm font-bold text-[var(--tl-primary-strong)] transition hover:border-[var(--tl-primary)] hover:text-[var(--tl-primary)]"
							>
								{t('continueShopping')}
							</button>
						</div>
					</footer>
				) : null}
			</aside>
		</>
	);
}
