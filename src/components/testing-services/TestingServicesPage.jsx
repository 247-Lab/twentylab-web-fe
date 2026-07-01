'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { CalendarDays, PhoneCall } from 'lucide-react';
import { useDeferredValue, useMemo, useState } from 'react';
import TestingServiceCard from './components/TestingServiceCard';
import TestingServicesEmptyState from './components/TestingServicesEmptyState';
import TestingServicesFilters from './components/TestingServicesFilters';
import TestingServicesHero from './components/TestingServicesHero';
import TestingServicesPagination from './components/TestingServicesPagination';

const ITEMS_PER_PAGE = 8;

function buildCategoryOptions(products, locale, t) {
	const categories = new Map();

	products.forEach((product) => {
		product.categories.forEach((category) => {
			if (!category?.id) {
				return;
			}

			const existing = categories.get(category.id);
			if (existing) {
				existing.count += 1;
				return;
			}

			categories.set(category.id, {
				id: category.id,
				name: category.name ?? t('fallbackCategory', { id: category.id }),
				count: 1,
			});
		});
	});

	return Array.from(categories.values()).sort((left, right) =>
		left.name.localeCompare(right.name, locale === 'es' ? 'es' : 'en')
	);
}

export default function TestingServicesPage({ products = [], locale = 'en', initialSearch = '' }) {
	const t = useTranslations('TestingServicesPage');
	const [search, setSearch] = useState(initialSearch);
	const [selectedCategoryId, setSelectedCategoryId] = useState('all');
	const [currentPage, setCurrentPage] = useState(1);
	const deferredSearch = useDeferredValue(search.trim().toLowerCase());

	const categoryOptions = useMemo(() => buildCategoryOptions(products, locale, t), [locale, products, t]);

	const filteredProducts = useMemo(() => {
		const byCategory =
			selectedCategoryId === 'all'
				? products
				: products.filter((product) =>
						product.categories.some((category) => String(category.id) === selectedCategoryId)
					);

		if (!deferredSearch) {
			return byCategory;
		}

		return byCategory.filter((product) => {
			const haystack = [
				product.name ?? String(product.id),
				product.description,
				product.categories.map((category) => category.name).join(' '),
			]
				.join(' ')
				.toLowerCase();

			return haystack.includes(deferredSearch);
		});
	}, [deferredSearch, products, selectedCategoryId]);

	const totalPages = Math.max(1, Math.ceil(filteredProducts.length / ITEMS_PER_PAGE));
	const safePage = Math.min(currentPage, totalPages);
	const visibleProducts = filteredProducts.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE);

	return (
		<main className="min-h-screen bg-[linear-gradient(180deg,#eef6ff_0%,#ffffff_38%,#f7fbff_100%)] text-[var(--tl-ink)]">
			<TestingServicesHero
				t={t}
				productsCount={products.length}
				categoryCount={categoryOptions.length}
				filteredCount={filteredProducts.length}
			/>

			<TestingServicesFilters
				t={t}
				search={search}
				setSearch={setSearch}
				selectedCategoryId={selectedCategoryId}
				setSelectedCategoryId={setSelectedCategoryId}
				categoryOptions={categoryOptions}
				filteredCount={filteredProducts.length}
				safePage={safePage}
				totalPages={totalPages}
				setCurrentPage={setCurrentPage}
			/>

			<section className="mx-auto w-full max-w-[1320px] px-4 pt-6 pb-12 lg:px-6 lg:pb-16">
				{visibleProducts.length > 0 ? (
					<>
						<div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
							{visibleProducts.map((product) => (
								<TestingServiceCard key={product.id} product={product} />
							))}
						</div>

						<TestingServicesPagination
							t={t}
							safePage={safePage}
							totalPages={totalPages}
							setCurrentPage={setCurrentPage}
						/>
					</>
				) : (
					<TestingServicesEmptyState t={t} setSearch={setSearch} setSelectedCategoryId={setSelectedCategoryId} />
				)}

				<section className="mt-10 rounded-[2rem] border border-sky-100 bg-[linear-gradient(135deg,#ffffff_0%,#f4f9ff_100%)] p-6 shadow-[0_22px_55px_-44px_rgba(2,6,14,0.8)] lg:p-8">
					<div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
						<div>
							<p className="text-sm font-bold tracking-[0.16em] text-[var(--tl-primary)] uppercase">{t('ctaTitle')}</p>
							<p className="mt-2 max-w-2xl text-base leading-relaxed text-slate-600">{t('ctaBody')}</p>
						</div>
						<div className="flex flex-wrap gap-3 lg:justify-end">
							<a
								href="tel:8139323741"
								className="inline-flex items-center gap-2 rounded-full bg-[var(--tl-primary)] px-5 py-3 text-sm font-bold text-white transition hover:bg-[var(--tl-primary-strong)]"
							>
								<PhoneCall className="h-4 w-4" />
								{t('callNow')}
							</a>
							<Link
								href="/contact"
								className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white px-5 py-3 text-sm font-bold text-[var(--tl-primary-strong)] transition hover:border-[var(--tl-primary)] hover:text-[var(--tl-primary)]"
							>
								<CalendarDays className="h-4 w-4" />
								{t('schedule')}
							</Link>
						</div>
					</div>
				</section>
			</section>
		</main>
	);
}
