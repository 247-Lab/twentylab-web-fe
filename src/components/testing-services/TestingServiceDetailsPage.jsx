'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, PhoneCall, ChevronDown } from 'lucide-react';
import React from 'react';
import { useCart } from '@/components/cart/CartProvider';
import RelatedProductsSection from '@/components/common/RelatedProductsSection';
import HtmlDescription from '@/components/common/HtmlDescription';
import { resolveImageUrl } from '@/lib/api';
import { shouldBypassImageOptimization } from '@/lib/image';
import TestingServiceCard from './components/TestingServiceCard';

function parsePrice(value) {
	const numeric = Number(value);
	return Number.isFinite(numeric) ? numeric : null;
}

function buildPriceModel(product) {
	const regularPrice = parsePrice(product?.regularPrice);
	const salePrice = parsePrice(product?.salePrice);
	const hasSale =
		regularPrice !== null && salePrice !== null && regularPrice > 0 && salePrice > 0 && salePrice < regularPrice;

	if (hasSale) {
		return {
			type: 'sale',
			regularPrice,
			salePrice,
		};
	}

	const basePrice = salePrice && salePrice > 0 ? salePrice : regularPrice;
	if (basePrice && basePrice > 0) {
		return {
			type: 'single',
			price: basePrice,
		};
	}

	const variantPrices = (product?.variants || [])
		.map((variant) => {
			const variantSalePrice = parsePrice(variant.salePrice);
			const variantRegularPrice = parsePrice(variant.regularPrice);
			return variantSalePrice && variantSalePrice > 0 ? variantSalePrice : variantRegularPrice;
		})
		.filter((price) => price && price > 0);

	if (variantPrices.length > 0) {
		const minimum = Math.min(...variantPrices);
		const maximum = Math.max(...variantPrices);

		return {
			type: minimum === maximum ? 'single' : 'range',
			minimum,
			maximum,
			price: minimum,
		};
	}

	return {
		type: 'contact',
	};
}

function renderDescription(description) {
	if (!description) {
		return null;
	}

	return <HtmlDescription content={description} />;
}

function getCategoryImage(category) {
	const imageCandidate =
		category?.mainImage ||
		category?.image ||
		category?.main_image ||
		category?.thumbnail ||
		category?.banner ||
		'/images/placeholder.png';

	return resolveImageUrl(imageCandidate);
}

export default React.memo(function TestingServiceDetailsPage({
	product,
	allProducts = [],
	allCategories = [],
	t,
	locale,
}) {
	const { addToCart } = useCart();

	// Helper to get translated string and substitute parameters
	const getMessage = (key, params = {}) => {
		const message = t?.[key] || '';
		if (!message || !Object.keys(params).length) return message;

		return Object.entries(params).reduce((result, [paramKey, paramValue]) => {
			return result.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), paramValue);
		}, message);
	};
	const sourceVariants = Array.isArray(product?.variants) ? product.variants : [];
	const [selectedVariantId, setSelectedVariantId] = useState('');
	const [selectedCategoryId, setSelectedCategoryId] = useState('all');
	const [added, setAdded] = useState(false);
	const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
	const [descriptionExpanded, setDescriptionExpanded] = useState(false);
	const [categoryDescriptionExpanded, setCategoryDescriptionExpanded] = useState(false);

	const productCategories = useMemo(() => {
		return Array.isArray(product?.categories) ? product.categories : [];
	}, [product.categories]);

	const variants = [...sourceVariants].sort((left, right) => {
		const leftModel = buildPriceModel(left);
		const rightModel = buildPriceModel(right);

		const leftPrice = leftModel.type === 'sale' ? leftModel.salePrice : leftModel.price || leftModel.minimum;
		const rightPrice = rightModel.type === 'sale' ? rightModel.salePrice : rightModel.price || rightModel.minimum;

		const safeLeftPrice = Number.isFinite(leftPrice) ? leftPrice : Number.POSITIVE_INFINITY;
		const safeRightPrice = Number.isFinite(rightPrice) ? rightPrice : Number.POSITIVE_INFINITY;
		return safeLeftPrice - safeRightPrice;
	});

	const selectedVariant = useMemo(() => {
		if (!selectedVariantId) {
			return null;
		}

		return variants.find((variant) => String(variant.id) === String(selectedVariantId)) || null;
	}, [selectedVariantId, variants]);

	const activeProduct = selectedVariant || product;
	const productName = activeProduct?.name ?? getMessage('fallbackProductName', { id: product?.id ?? '-' });
	const selectedCategory = useMemo(() => {
		if (selectedCategoryId === 'all') {
			return null;
		}

		return (
			allCategories.find((category) => String(category.id) === String(selectedCategoryId)) ||
			productCategories.find((category) => String(category.id) === String(selectedCategoryId)) ||
			null
		);
	}, [allCategories, productCategories, selectedCategoryId]);
	const categoryName =
		selectedCategory?.name ??
		getMessage('fallbackProductName', { id: selectedCategory?.id ?? selectedCategoryId ?? '-' });
	const categoryDescription = selectedCategory?.description || selectedCategory?.shortDescription || '';
	const categoryImage = getCategoryImage(selectedCategory);
	const pricing = buildPriceModel(activeProduct);
	const descriptionText = activeProduct?.description || product?.description;
	const isDescriptionLong = descriptionText && descriptionText.length > 300;
	const isCategoryDescriptionLong = categoryDescription && categoryDescription.length > 300;

	const productImage = useMemo(() => {
		const finalPath = selectedVariant?.mainImage || product?.mainImage || '/images/placeholder.png';
		return resolveImageUrl(finalPath);
	}, [selectedVariant, product]);

	const isAddToCartDisabled = variants.length > 0 && !selectedVariantId;

	const categoryProducts = useMemo(() => {
		if (selectedCategoryId === 'all') {
			return [];
		}

		return allProducts.filter((entry) =>
			entry.categories.some((category) => String(category.id) === String(selectedCategoryId))
		);
	}, [allProducts, selectedCategoryId]);

	const relatedProducts = useMemo(() => {
		if (!Array.isArray(productCategories) || productCategories.length === 0) {
			return [];
		}

		const productCategoryIds = new Set(productCategories.map((category) => String(category.id)));

		return allProducts.filter(
			(entry) =>
				String(entry.id) !== String(product.id) &&
				entry.categories.some((category) => productCategoryIds.has(String(category.id)))
		);
	}, [allProducts, product.id, productCategories]);

	const formatPrice = (value, localeOverride = locale) => {
		if (!Number.isFinite(value)) {
			return getMessage('contactUs');
		}

		return new Intl.NumberFormat(localeOverride === 'es' ? 'es-US' : 'en-US', {
			style: 'currency',
			currency: 'USD',
			maximumFractionDigits: 2,
		}).format(value);
	};

	const formatProductPrice = (entry) => {
		const model = buildPriceModel(entry);
		if (model.type === 'sale') {
			return formatPrice(model.salePrice);
		}

		if (model.type === 'single') {
			return formatPrice(model.price);
		}

		if (model.type === 'range') {
			return getMessage('variantRange', {
				min: formatPrice(model.minimum),
				max: formatPrice(model.maximum),
			});
		}

		return getMessage('contactUs');
	};

	function handleAddToCart() {
		const selectedItem = selectedVariant || product;
		addToCart(selectedItem, {
			variantId: selectedVariant ? selectedVariant.id : null,
			variantLabel: selectedVariant ? selectedVariant.name : null,
		});
		setAdded(true);
		window.setTimeout(() => setAdded(false), 1800);
	}

	return (
		<main className="min-h-screen bg-[linear-gradient(180deg,#eef6ff_0%,#ffffff_40%,#f7fbff_100%)] text-[var(--tl-ink)]">
			<section className="mx-auto w-full max-w-[1440px] overflow-x-clip px-4 pt-8 pb-14 lg:px-6 lg:pt-10 lg:pb-16">
				<div className="mb-6 flex flex-wrap items-center gap-3">
					<Link
						href="/testing-services"
						className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-[var(--tl-primary)] hover:text-[var(--tl-primary)]"
					>
						<ArrowLeft className="h-4 w-4" />
						{getMessage('backToServices')}
					</Link>
				</div>

				<div className="grid gap-8 lg:grid-cols-[280px_1fr]">
					{/* Category Sidebar */}
					<aside className="h-fit rounded-2xl border border-sky-100 bg-white p-5 shadow-[0_18px_50px_-42px_rgba(2,6,14,0.9)] sm:p-6">
						<button
							onClick={() => setCategoryDropdownOpen((prev) => !prev)}
							className="flex w-full items-center justify-between lg:hidden"
						>
							<h3 className="font-display text-lg font-black text-[var(--tl-metallic-black)]">
								{getMessage('categoriesTitle') || 'Categories'}
							</h3>
							<ChevronDown className={`h-5 w-5 transition-transform ${categoryDropdownOpen ? 'rotate-180' : ''}`} />
						</button>
						<h3 className="font-display hidden text-lg font-black text-[var(--tl-metallic-black)] lg:block">
							{getMessage('categoriesTitle') || 'Categories'}
						</h3>
						<div className={`mt-4 space-y-2 ${categoryDropdownOpen ? 'block' : 'hidden lg:block'}`}>
							<button
								onClick={() => {
									setSelectedCategoryId('all');
									setCategoryDropdownOpen(false);
								}}
								className={`block w-full rounded-lg px-4 py-3 text-left text-sm font-semibold break-words transition ${
									selectedCategoryId === 'all'
										? 'bg-sky-100 text-[var(--tl-primary)]'
										: 'text-slate-700 hover:bg-sky-50 hover:text-[var(--tl-primary)]'
								}`}
							>
								{getMessage('allCategories') || 'All Categories'}
							</button>
							{allCategories.map((category) => (
								<button
									key={category.id}
									onClick={() => {
										setSelectedCategoryId(String(category.id));
										setCategoryDropdownOpen(false);
									}}
									className={`block w-full rounded-lg px-4 py-3 text-left text-sm font-semibold break-words transition ${
										String(selectedCategoryId) === String(category.id)
											? 'bg-sky-100 text-[var(--tl-primary)]'
											: 'text-slate-700 hover:bg-sky-50 hover:text-[var(--tl-primary)]'
									}`}
								>
									{category.name}
								</button>
							))}
						</div>
					</aside>

					{/* Main Content */}
					<div className="min-w-0">
						{selectedCategory ? (
							<>
								<div className="rounded-[2rem] border border-sky-100 bg-white p-5 shadow-[0_24px_60px_-45px_rgba(2,6,14,0.85)] md:p-7 lg:p-8">
									<div className="grid gap-8 md:grid-cols-[1fr_1.1fr]">
										<div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-slate-100">
											<Image
												src={categoryImage}
												alt={categoryName}
												fill
												unoptimized={shouldBypassImageOptimization(categoryImage)}
												sizes="(max-width: 768px) 100vw, 45vw"
												className="object-cover"
											/>
										</div>
										<div>
											<p className="text-xs font-bold tracking-[0.14em] text-[var(--tl-primary)] uppercase">
												{getMessage('categoriesTitle')}
											</p>
											<h1 className="font-display mt-2 text-2xl leading-tight font-black break-words text-[var(--tl-metallic-black)] sm:text-3xl lg:text-4xl">
												{categoryName}
											</h1>
											<p className="mt-5 text-sm font-semibold text-slate-600">
												{categoryProducts.length} {getMessage('relatedTitle').toLowerCase()}
											</p>
										</div>
									</div>
								</div>

								<div className="mt-7 rounded-[1.5rem] border border-sky-100 bg-white p-5 shadow-[0_18px_50px_-42px_rgba(2,6,14,0.9)] md:p-6">
									<h2 className="font-display text-xl font-black text-[var(--tl-metallic-black)]">
										{getMessage('descriptionTitle')}
									</h2>
									<div className="mt-3">
										{!categoryDescriptionExpanded && isCategoryDescriptionLong ? (
											<>
												{renderDescription(categoryDescription?.slice(0, 300) + '...')}
												<button
													onClick={() => setCategoryDescriptionExpanded(true)}
													className="mt-3 text-sm font-semibold text-[var(--tl-primary)] hover:text-[var(--tl-primary-strong)]"
												>
													{getMessage('readMore') || 'Read More'}
												</button>
											</>
										) : (
											<>
												{renderDescription(categoryDescription)}
												{isCategoryDescriptionLong && (
													<button
														onClick={() => setCategoryDescriptionExpanded(false)}
														className="mt-3 text-sm font-semibold text-[var(--tl-primary)] hover:text-[var(--tl-primary-strong)]"
													>
														{getMessage('readLess') || 'Read Less'}
													</button>
												)}
											</>
										)}
									</div>
								</div>

								<RelatedProductsSection
									title={categoryName}
									items={categoryProducts}
									renderItem={(categoryProduct) => <TestingServiceCard product={categoryProduct} />}
								/>
							</>
						) : (
							<>
								<div className="rounded-[2rem] border border-sky-100 bg-white p-5 shadow-[0_24px_60px_-45px_rgba(2,6,14,0.85)] md:p-7 lg:p-8">
									<div className="grid gap-8 md:grid-cols-[1fr_1.1fr]">
										<div>
											<div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-slate-100">
												<Image
													src={productImage}
													alt={productName}
													fill
													unoptimized={shouldBypassImageOptimization(productImage)}
													sizes="(max-width: 768px) 100vw, 45vw"
													className="object-cover"
												/>
											</div>
										</div>

										<div className="flex flex-col justify-between">
											<div>
												<p className="text-xs font-bold tracking-[0.14em] text-[var(--tl-primary)] uppercase">
													{getMessage('serviceDetails')}
												</p>
												<h1 className="font-display mt-2 text-2xl leading-tight font-black break-words text-[var(--tl-metallic-black)] sm:text-3xl lg:text-4xl">
													{productName}
												</h1>

												<div className="mt-6">
													{pricing.type === 'sale' && (
														<div className="flex items-baseline gap-3">
															<p className="text-base font-semibold text-slate-400 line-through">
																{formatPrice(pricing.regularPrice)}
															</p>
															<p className="font-display text-3xl font-black text-[var(--tl-metallic-black)]">
																{formatPrice(pricing.salePrice)}
															</p>
														</div>
													)}

													{pricing.type === 'single' && (
														<p className="font-display text-3xl font-black text-[var(--tl-metallic-black)]">
															{formatPrice(pricing.price)}
														</p>
													)}

													{pricing.type === 'range' && (
														<p className="font-display text-3xl font-black text-[var(--tl-metallic-black)]">
															{getMessage('variantRange', {
																min: formatPrice(pricing.minimum),
																max: formatPrice(pricing.maximum),
															})}
														</p>
													)}

													{pricing.type === 'contact' && (
														<p className="font-display text-3xl font-black text-[var(--tl-metallic-black)]">
															{getMessage('contactUs')}
														</p>
													)}
												</div>

												{productCategories.length > 0 && (
													<p className="mt-6 text-sm text-slate-600">
														<span className="font-semibold text-slate-800">{getMessage('categoryLabel')}: </span>
														{productCategories.map((category) => category.name).join(', ')}
													</p>
												)}
											</div>

											<div>
												{variants.length > 0 && (
													<div className="mt-6 rounded-2xl border border-sky-100 bg-sky-50/70 p-4">
														<label
															className="text-sm font-bold text-slate-800"
															htmlFor="testing-service-variant-select"
														>
															{getMessage('variationLabel')}
														</label>
														<select
															id="testing-service-variant-select"
															className="mt-2 w-full rounded-xl border border-sky-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-[var(--tl-primary)] focus:ring-2 focus:ring-[var(--tl-primary)]/20"
															value={selectedVariantId}
															onChange={(event) => setSelectedVariantId(event.target.value)}
														>
															<option value="">{getMessage('selectVariationPlaceholder')}</option>
															{variants.map((variant) => (
																<option key={variant.id} value={variant.id}>
																	{variant.name || getMessage('fallbackProductName', { id: variant.id })} -{' '}
																	{formatProductPrice(variant)}
																</option>
															))}
														</select>

														<p className="mt-3 text-sm font-bold text-slate-800">{getMessage('optionsAvailable')}</p>
														<ul className="mt-2 space-y-1">
															{variants.slice(0, 8).map((variant) => (
																<li key={variant.id} className="text-sm text-slate-600">
																	{variant.name || getMessage('fallbackProductName', { id: variant.id })} -{' '}
																	{formatProductPrice(variant)}
																</li>
															))}
														</ul>
													</div>
												)}

												<div className="mt-6 flex flex-wrap gap-3">
													<button
														type="button"
														onClick={handleAddToCart}
														disabled={isAddToCartDisabled}
														className={`inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold text-white transition ${
															isAddToCartDisabled
																? 'cursor-not-allowed bg-slate-300 opacity-70'
																: added
																	? 'bg-emerald-600 hover:bg-emerald-700'
																	: 'bg-[var(--tl-primary)] hover:bg-[var(--tl-primary-strong)]'
														}`}
													>
														{added ? getMessage('addedToCart') : getMessage('addToCart')}
													</button>
													<Link
														href={`/contact?message=${encodeURIComponent(`I am interested in ${productName}.`)}`}
														className="inline-flex items-center gap-2 rounded-full bg-[var(--tl-primary)] px-6 py-3 text-sm font-bold text-white transition hover:bg-[var(--tl-primary-strong)]"
													>
														{getMessage('bookTest')}
														<ArrowRight className="h-4 w-4" />
													</Link>
													<a
														href="tel:8139323741"
														className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white px-6 py-3 text-sm font-bold text-[var(--tl-primary-strong)] transition hover:border-[var(--tl-primary)] hover:text-[var(--tl-primary)]"
													>
														<PhoneCall className="h-4 w-4" />
														{getMessage('callNow')}
													</a>
												</div>
											</div>
										</div>
									</div>
								</div>

								<div className="mt-7 rounded-[1.5rem] border border-sky-100 bg-white p-5 shadow-[0_18px_50px_-42px_rgba(2,6,14,0.9)] md:p-6">
									<h2 className="font-display text-xl font-black text-[var(--tl-metallic-black)]">
										{getMessage('descriptionTitle')}
									</h2>
									<div className="mt-3">
										{!descriptionExpanded && isDescriptionLong ? (
											<>
												{renderDescription(descriptionText?.slice(0, 300) + '...')}
												<button
													onClick={() => setDescriptionExpanded(true)}
													className="mt-3 text-sm font-semibold text-[var(--tl-primary)] hover:text-[var(--tl-primary-strong)]"
												>
													{getMessage('readMore') || 'Read More'}
												</button>
											</>
										) : (
											<>
												{renderDescription(descriptionText)}
												{isDescriptionLong && (
													<button
														onClick={() => setDescriptionExpanded(false)}
														className="mt-3 text-sm font-semibold text-[var(--tl-primary)] hover:text-[var(--tl-primary-strong)]"
													>
														{getMessage('readLess') || 'Read Less'}
													</button>
												)}
											</>
										)}
									</div>
								</div>

								<RelatedProductsSection
									title={getMessage('relatedTitle')}
									items={relatedProducts}
									renderItem={(relatedProduct) => <TestingServiceCard product={relatedProduct} />}
								/>
							</>
						)}
					</div>
				</div>
			</section>
		</main>
	);
});
