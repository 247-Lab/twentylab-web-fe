'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { ArrowLeft, Sparkles, X } from 'lucide-react';
import { TEST_FINDER_TREE } from '@/components/common/ai-test-finder/tree';
import useRecommendedProducts from '@/components/common/ai-test-finder/useRecommendedProducts';
import { getCurrentLocale, getLabel } from '@/components/common/ai-test-finder/utils';
import { shouldBypassImageOptimization } from '@/lib/image';

export default function AITestFinderModal({ isOpen, onClose }) {
	const t = useTranslations('AITestFinderModal');
	const locale = useLocale();
	const language = getCurrentLocale(locale);
	const copy = {
		title: t('title'),
		subtitle: t('subtitle'),
		close: t('close'),
		back: t('back'),
		step: t('step'),
		of: t('of'),
		intentTitle: t('intentTitle'),
		categoryTitle: t('categoryTitle'),
		subcategoryTitle: t('subcategoryTitle'),
		refinementTitle: t('refinementTitle'),
		recommendedTitle: t('recommendedTitle'),
		recommendedBody: t('recommendedBody'),
		loading: t('loading'),
		empty: t('empty'),
		price: t('price'),
		priceUnavailable: t('priceUnavailable'),
		bookNow: t('bookNow'),
		fallbackProductName: t('fallbackProductName'),
		fallbackTestName: t('fallbackTestName'),
		ariaLabel: t('ariaLabel'),
		badgeTitle: t('badgeTitle'),
	};
	const currencyFormatter = useMemo(
		() =>
			new Intl.NumberFormat(language === 'es' ? 'es-US' : 'en-US', {
				style: 'currency',
				currency: 'USD',
			}),
		[language]
	);

	const [step, setStep] = useState(1);
	const [path, setPath] = useState({
		intent: null,
		category: null,
		subcategory: null,
		refinement: null,
	});

	const activeIntent = useMemo(() => (path.intent ? TEST_FINDER_TREE[path.intent] : null), [path.intent]);

	const activeCategory = useMemo(() => {
		if (!activeIntent || !path.category) {
			return null;
		}

		return activeIntent.categories[path.category] || null;
	}, [activeIntent, path.category]);

	const activeSubcategory = useMemo(() => {
		if (!activeCategory || !path.subcategory) {
			return null;
		}

		return activeCategory.subcategories[path.subcategory] || null;
	}, [activeCategory, path.subcategory]);

	const selectedProductIds = useMemo(() => {
		if (!activeSubcategory || !path.refinement) {
			return [];
		}

		return activeSubcategory.refinements[path.refinement]?.productIds || [];
	}, [activeSubcategory, path.refinement]);

	const { isLoadingProducts, recommendedProducts, resetRecommendedProducts } = useRecommendedProducts({
		isOpen,
		step,
		selectedProductIds,
		fallbackTestName: copy.fallbackTestName,
	});

	useEffect(() => {
		if (!isOpen) {
			return undefined;
		}

		const onKeyDown = (event) => {
			if (event.key === 'Escape') {
				onClose();
			}
		};

		document.body.style.overflow = 'hidden';
		document.body.classList.add('ai-test-finder-modal-open');
		window.addEventListener('keydown', onKeyDown);

		return () => {
			document.body.style.overflow = '';
			document.body.classList.remove('ai-test-finder-modal-open');
			window.removeEventListener('keydown', onKeyDown);
		};
	}, [isOpen, onClose]);

	if (!isOpen) {
		return null;
	}

	const resetAndClose = () => {
		setStep(1);
		setPath({
			intent: null,
			category: null,
			subcategory: null,
			refinement: null,
		});
		resetRecommendedProducts();
		onClose();
	};

	const stepProgress = Math.min((step / 4) * 100, 100);

	const intentOptions = Object.entries(TEST_FINDER_TREE);
	const categoryOptions = activeIntent ? Object.entries(activeIntent.categories) : [];
	const subcategoryOptions = activeCategory ? Object.entries(activeCategory.subcategories) : [];
	const refinementOptions = activeSubcategory ? Object.entries(activeSubcategory.refinements) : [];

	const showBack = step > 1;
	const formatPrice = (price) =>
		typeof price === 'number' && Number.isFinite(price) ? currencyFormatter.format(price) : copy.priceUnavailable;

	const getStepTitle = () => {
		if (step === 1) {
			return copy.intentTitle;
		}
		if (step === 2) {
			return copy.categoryTitle;
		}
		if (step === 3) {
			return copy.subcategoryTitle;
		}
		if (step === 4) {
			return copy.refinementTitle;
		}
		return copy.recommendedTitle;
	};

	const goBack = () => {
		if (step === 5) {
			setStep(4);
			resetRecommendedProducts();
			return;
		}

		if (step === 4) {
			setStep(3);
			setPath((prev) => ({ ...prev, refinement: null }));
			return;
		}

		if (step === 3) {
			setStep(2);
			setPath((prev) => ({ ...prev, subcategory: null, refinement: null }));
			return;
		}

		if (step === 2) {
			setStep(1);
			setPath({
				intent: null,
				category: null,
				subcategory: null,
				refinement: null,
			});
		}
	};

	const renderStepContent = () => {
		if (step === 1) {
			return (
				<div className="grid gap-3 sm:grid-cols-2">
					{intentOptions.map(([intentKey, intent]) => (
						<button
							key={intentKey}
							type="button"
							onClick={() => {
								setPath({
									intent: intentKey,
									category: null,
									subcategory: null,
									refinement: null,
								});
								setStep(2);
							}}
							className="rounded-2xl border border-sky-200 bg-sky-50/70 px-3 py-3 text-left transition hover:border-[var(--tl-primary)] hover:bg-white sm:px-4 sm:py-4"
						>
							<p className="font-display text-sm font-bold text-slate-900 sm:text-base">
								{getLabel(intent.label, language)}
							</p>
						</button>
					))}
				</div>
			);
		}

		if (step === 2) {
			return (
				<div className="grid gap-3 sm:grid-cols-2">
					{categoryOptions.map(([categoryKey, category]) => (
						<button
							key={categoryKey}
							type="button"
							onClick={() => {
								setPath((prev) => ({
									...prev,
									category: categoryKey,
									subcategory: null,
									refinement: null,
								}));
								setStep(3);
							}}
							className="rounded-2xl border border-sky-200 bg-sky-50/70 px-3 py-3 text-left transition hover:border-[var(--tl-primary)] hover:bg-white sm:px-4 sm:py-4"
						>
							<p className="font-display text-sm font-bold text-slate-900 sm:text-base">
								{getLabel(category.label, language)}
							</p>
						</button>
					))}
				</div>
			);
		}

		if (step === 3) {
			return (
				<div className="grid gap-3 sm:grid-cols-2">
					{subcategoryOptions.map(([subcategoryKey, subcategory]) => (
						<button
							key={subcategoryKey}
							type="button"
							onClick={() => {
								setPath((prev) => ({
									...prev,
									subcategory: subcategoryKey,
									refinement: null,
								}));
								setStep(4);
							}}
							className="rounded-2xl border border-sky-200 bg-sky-50/70 px-3 py-3 text-left transition hover:border-[var(--tl-primary)] hover:bg-white sm:px-4 sm:py-4"
						>
							<p className="font-display text-sm font-bold text-slate-900 sm:text-base">
								{getLabel(subcategory.label, language)}
							</p>
						</button>
					))}
				</div>
			);
		}

		if (step === 4) {
			return (
				<div className="grid gap-3 sm:grid-cols-2">
					{refinementOptions.map(([refinementKey, refinement]) => (
						<button
							key={refinementKey}
							type="button"
							onClick={() => {
								setPath((prev) => ({ ...prev, refinement: refinementKey }));
								setStep(5);
							}}
							className="rounded-2xl border border-sky-200 bg-sky-50/70 px-3 py-3 text-left transition hover:border-[var(--tl-primary)] hover:bg-white sm:px-4 sm:py-4"
						>
							<p className="font-display text-sm font-bold text-slate-900 sm:text-base">
								{getLabel(refinement.label, language)}
							</p>
						</button>
					))}
				</div>
			);
		}

		return (
			<div className="flex h-full min-h-0 flex-col gap-4">
				<p className="text-[13px] text-slate-600 sm:text-sm">{copy.recommendedBody}</p>

				{isLoadingProducts ? (
					<p className="rounded-2xl border border-sky-100 bg-sky-50/70 px-3 py-4 text-xs font-semibold text-[var(--tl-primary)] sm:px-4 sm:py-5 sm:text-sm">
						{copy.loading}
					</p>
				) : recommendedProducts.length === 0 ? (
					<p className="rounded-2xl border border-sky-100 bg-sky-50/70 px-3 py-4 text-xs text-slate-600 sm:px-4 sm:py-5 sm:text-sm">
						{copy.empty}
					</p>
				) : (
					<div className="min-h-0 flex-1 overflow-y-auto pr-1">
						{recommendedProducts.map((product) => (
							<div
								key={product.id}
								className="mb-3 flex flex-col gap-3 rounded-2xl border border-sky-100 bg-white p-3 shadow-sm transition last:mb-0 hover:border-sky-200 sm:flex-row sm:items-center sm:gap-4 sm:p-4"
							>
								<div className="to-sky-25 relative h-20 w-full shrink-0 overflow-hidden rounded-xl bg-gradient-to-b from-sky-50 sm:h-20 sm:w-24">
									{product.image ? (
										<Image
											src={product.image}
											alt={product.name ?? `${copy.fallbackProductName} ${product.id}`}
											fill
											sizes="(max-width: 640px) 100vw, 96px"
											unoptimized={shouldBypassImageOptimization(product.image)}
											className="object-cover object-center"
										/>
									) : (
										<div className="grid h-full w-full place-items-center">
											<div className="text-center">
												<p className="text-lg font-bold text-sky-200">#{product.id}</p>
											</div>
										</div>
									)}
								</div>
								<div className="min-w-0 flex-1">
									<div className="space-y-1">
										<p className="font-display truncate text-sm font-bold text-slate-900 sm:text-lg">
											{product.name ?? `${copy.fallbackProductName} ${product.id}`}
										</p>
										<p className="text-xs font-semibold text-[var(--tl-primary-strong)] sm:text-sm">
											{copy.price}: {formatPrice(product.price)}
										</p>
									</div>
								</div>
								<div className="w-full sm:w-auto">
									<Link
										href={`/testing-services/${product.id}`}
										onClick={resetAndClose}
										className="inline-flex w-full items-center justify-center rounded-full bg-[var(--tl-primary)] px-4 py-2.5 text-xs font-bold tracking-wide text-white uppercase transition hover:bg-[var(--tl-primary-strong)] sm:w-auto sm:min-w-[132px]"
									>
										{copy.bookNow}
									</Link>
								</div>
							</div>
						))}
					</div>
				)}
			</div>
		);
	};

	return (
		<div
			className="fixed inset-0 z-[500] flex items-start justify-center overflow-hidden bg-slate-900/45 px-3 pt-[100px] pb-3 sm:items-center sm:pt-24"
			role="dialog"
			aria-modal="true"
			aria-label={copy.ariaLabel}
			onPointerDown={(event) => {
				if (event.target === event.currentTarget) {
					resetAndClose();
				}
			}}
		>
			<div
				className="flex max-h-[calc(100dvh-7.25rem)] w-full max-w-3xl flex-col overflow-hidden rounded-[20px] border border-white/60 bg-[linear-gradient(180deg,#f7fbff_0%,#ffffff_100%)] p-3 shadow-[0_30px_80px_-35px_rgba(3,86,197,0.55)] sm:max-h-[calc(100dvh-3rem)] sm:rounded-[24px] sm:p-6"
				onPointerDown={(event) => event.stopPropagation()}
			>
				<div className="flex items-start justify-between gap-3">
					<div className="min-w-0">
						<p className="inline-flex items-center gap-2 rounded-full border border-sky-100 bg-white px-3 py-1 text-[11px] font-semibold tracking-[0.14em] text-[var(--tl-primary)] uppercase">
							<Sparkles className="h-3.5 w-3.5" />
							{copy.badgeTitle}
						</p>
						<h3 className="font-display mt-2 text-lg leading-tight font-black text-slate-900 sm:mt-3 sm:text-2xl">
							{copy.title}
						</h3>
						<p className="mt-1 text-xs leading-relaxed text-slate-600 sm:text-sm">{copy.subtitle}</p>
					</div>
					<button
						type="button"
						onClick={resetAndClose}
						className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 sm:h-10 sm:w-10"
						aria-label={copy.close}
					>
						<X className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
					</button>
				</div>

				<div className="mt-2 sm:mt-5">
					<div className="flex items-center justify-between text-[11px] font-semibold tracking-[0.08em] text-slate-500 uppercase sm:text-xs">
						<span>
							{copy.step} {Math.min(step, 4)} {copy.of} 4
						</span>
						{showBack ? (
							<button
								type="button"
								onClick={goBack}
								className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-[10px] font-bold text-slate-700 transition hover:border-[var(--tl-primary)] hover:text-[var(--tl-primary)] sm:px-3 sm:py-1 sm:text-[11px]"
							>
								<ArrowLeft className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
								{copy.back}
							</button>
						) : (
							<span />
						)}
					</div>
					<div className="mt-2 h-1.5 rounded-full bg-sky-100 sm:h-2">
						<div
							className="h-full rounded-full bg-[var(--tl-primary)] transition-all duration-300"
							style={{ width: `${stepProgress}%` }}
						/>
					</div>
				</div>

				<div className="mt-4 flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-sky-100/80 bg-white/90 p-3.5 sm:mt-5 sm:p-5">
					<h4 className="font-display text-base font-extrabold text-slate-900 sm:text-lg">{getStepTitle()}</h4>
					<div className="mt-3 min-h-0 flex-1 overflow-y-auto pr-1 sm:mt-4">{renderStepContent()}</div>
				</div>
			</div>
		</div>
	);
}
