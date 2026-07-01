'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import React, { useEffect, useState, useMemo } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useCart } from '@/components/cart/CartProvider';
import { summarizeHtml } from '@/lib/htmlSanitizer';
import { shouldBypassImageOptimization } from '@/lib/image';

function parsePrice(value) {
	const numericValue = Number(value);
	return Number.isFinite(numericValue) ? numericValue : null;
}

function getVariantPrices(variants = []) {
	return variants
		.map((variant) => {
			const sale = parsePrice(variant.salePrice);
			const regular = parsePrice(variant.regularPrice);
			const resolvedPrice = sale && sale > 0 ? sale : regular;
			return resolvedPrice && resolvedPrice > 0 ? resolvedPrice : null;
		})
		.filter((price) => price !== null);
}

function getPricingModel(product) {
	const regularPrice = parsePrice(product.regularPrice);
	const salePrice = parsePrice(product.salePrice);
	const hasSale =
		regularPrice !== null && salePrice !== null && regularPrice > 0 && salePrice > 0 && salePrice < regularPrice;

	const variantPrices = getVariantPrices(product.variants);
	const shouldUseVariantRange =
		variantPrices.length > 0 && (regularPrice === null || regularPrice <= 0) && (salePrice === null || salePrice <= 0);

	if (shouldUseVariantRange) {
		const minimum = Math.min(...variantPrices);
		const maximum = Math.max(...variantPrices);

		return {
			type: minimum === maximum ? 'single' : 'range',
			minimum,
			maximum,
		};
	}

	if (hasSale) {
		return {
			type: 'sale',
			regularPrice,
			salePrice,
		};
	}

	const fallbackPrice =
		salePrice !== null && salePrice > 0 ? salePrice : regularPrice !== null && regularPrice > 0 ? regularPrice : null;

	if (fallbackPrice !== null) {
		return {
			type: 'single',
			minimum: fallbackPrice,
			maximum: fallbackPrice,
		};
	}

	return {
		type: 'contact',
	};
}

function formatPrice(value, locale) {
	if (!Number.isFinite(value)) {
		return null;
	}

	return new Intl.NumberFormat(locale === 'es' ? 'es-US' : 'en-US', {
		style: 'currency',
		currency: 'USD',
		maximumFractionDigits: 2,
	}).format(value);
}

export default React.memo(function TestingServiceCard({ product }) {
	const t = useTranslations('TestingServicesPage');
	const locale = useLocale();
	const { addToCart } = useCart();
	const [added, setAdded] = useState(false);
	const productName = product.name ?? t('fallbackProductName', { id: product.id });
	const categoryNames = product.categories.length
		? product.categories.map((category) => category.name).join(', ')
		: t('emptyCategory');
	const pricingModel = getPricingModel(product);
	const hasVariants = Array.isArray(product.variants) && product.variants.length > 0;
	const descriptionSummary = useMemo(() => summarizeHtml(product.description, 145), [product.description]);
	const productImage = product.mainImage || product.image || '/images/placeholder.png';

	useEffect(() => {
		if (!added) {
			return undefined;
		}

		const timeoutId = window.setTimeout(() => setAdded(false), 1800);
		return () => window.clearTimeout(timeoutId);
	}, [added]);

	function handleAddToCart(event) {
		event.preventDefault();
		event.stopPropagation();
		addToCart(product);
		setAdded(true);
	}

	return (
		<article className="group relative flex h-full flex-col overflow-hidden rounded-[1.75rem] border border-sky-100 bg-white transition hover:-translate-y-1">
			{pricingModel.type === 'sale' && (
				<div className="absolute top-3 right-3 z-10 rounded-full bg-red-600 px-3 py-1 text-xs font-bold tracking-[0.08em] text-white uppercase shadow-lg">
					{t('onSale')}
				</div>
			)}

			<div className="aspect-[4/3] overflow-hidden bg-slate-100">
				<Link
					href={`/testing-services/${product.id}`}
					className="relative block h-full w-full"
					aria-label={productName}
				>
					<Image
						src={productImage}
						alt={productName}
						fill
						sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 25vw"
						unoptimized={shouldBypassImageOptimization(productImage)}
						className="object-cover transition duration-500 group-hover:scale-105"
					/>
				</Link>
			</div>

			<div className="flex h-full flex-1 flex-col p-5">
				<p className="text-xs font-bold tracking-[0.12em] text-[var(--tl-primary)] uppercase sm:tracking-[0.14em]">
					{categoryNames}
				</p>
				<h2 className="font-display mt-2 text-xl leading-snug font-extrabold text-[var(--tl-metallic-black)]">
					<Link href={`/testing-services/${product.id}`} className="transition hover:text-[var(--tl-primary)]">
						{productName}
					</Link>
				</h2>
				<p className="mt-3 flex-1 text-sm leading-relaxed break-words text-slate-600">{descriptionSummary}</p>

				<div className="mt-5 border-t border-slate-100 pt-4">
					{pricingModel.type === 'sale' && (
						<p className="text-center text-base font-semibold text-slate-400 line-through">
							{formatPrice(pricingModel.regularPrice, locale)}
						</p>
					)}

					{pricingModel.type === 'sale' && (
						<p className="font-display text-center text-2xl font-black text-[var(--tl-metallic-black)]">
							{formatPrice(pricingModel.salePrice, locale)}
						</p>
					)}

					{pricingModel.type === 'single' && (
						<p className="font-display text-center text-2xl font-black text-[var(--tl-metallic-black)]">
							{formatPrice(pricingModel.minimum, locale)}
						</p>
					)}

					{pricingModel.type === 'range' && (
						<p className="font-display text-center text-2xl font-black text-[var(--tl-metallic-black)]">
							{t('variantRange', {
								min: formatPrice(pricingModel.minimum, locale),
								max: formatPrice(pricingModel.maximum, locale),
							})}
						</p>
					)}

					{pricingModel.type === 'contact' && (
						<p className="font-display text-center text-2xl font-black text-[var(--tl-metallic-black)]">
							{t('contactUs')}
						</p>
					)}

					<div className="mt-3 flex justify-center">
						{hasVariants ? (
							<Link
								href={`/testing-services/${product.id}`}
								className="inline-flex max-w-full items-center justify-center gap-2 rounded-full bg-[var(--tl-primary)] px-4 py-2.5 text-center text-sm font-bold text-white transition hover:bg-[var(--tl-primary-strong)] sm:px-5 sm:whitespace-nowrap"
							>
								{t('viewOptions')}
								<ArrowRight className="h-4 w-4" />
							</Link>
						) : (
							<button
								type="button"
								onClick={handleAddToCart}
								className={`inline-flex max-w-full items-center justify-center gap-2 rounded-full px-4 py-2.5 text-center text-sm font-bold text-white transition sm:px-5 sm:whitespace-nowrap ${
									added
										? 'bg-emerald-600 hover:bg-emerald-700'
										: 'bg-[var(--tl-primary)] hover:bg-[var(--tl-primary-strong)]'
								}`}
							>
								{added ? t('addedToCart') : t('addToCart')}
							</button>
						)}
					</div>
				</div>
			</div>
		</article>
	);
});
