'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ArrowLeft } from 'lucide-react';
import HtmlDescription from '@/components/common/HtmlDescription';
import TestingServiceCard from '@/components/testing-services/components/TestingServiceCard';
import { resolveImageUrl } from '@/lib/api';

export default function CategoryDetailPage({ category, products = [] }) {
	const t = useTranslations('CategoryDetailPage');
	const categoryName = category?.name || t('fallbackTitle', { id: category?.id });
	const categoryImage = category?.main_image || category?.mainImage || '/images/placeholder.png';
	const resolvedCategoryImage = resolveImageUrl(categoryImage);
	const categoryDescription = category?.description || category?.shortDescription || '';

	return (
		<main className="min-h-screen bg-[linear-gradient(180deg,#eef6ff_0%,#ffffff_40%,#f7fbff_100%)]">
			{/* Hero Section */}
			<section className="relative overflow-hidden bg-gradient-to-b from-sky-100 to-white">
				<div className="mx-auto w-full max-w-[1440px] px-4 pt-8 lg:px-6">
					<Link
						href="/testing-services"
						className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-[var(--tl-primary)] hover:text-[var(--tl-primary)]"
					>
						<ArrowLeft className="h-4 w-4" />
						{t('backToServices')}
					</Link>

					<div className="mt-8 grid gap-8 lg:grid-cols-2 lg:items-center">
						{categoryImage && (
							<div className="relative aspect-square overflow-hidden rounded-2xl">
								<Image
									src={resolvedCategoryImage}
									alt={categoryName}
									fill
									className="object-cover"
									sizes="(max-width: 1024px) 100vw, 50vw"
									priority
								/>
							</div>
						)}

						<div>
							<p className="text-xs font-bold tracking-[0.18em] text-[var(--tl-primary)] uppercase">{t('eyebrow')}</p>
							<h1 className="font-display mt-3 text-4xl leading-tight font-black text-[var(--tl-metallic-black)] md:text-5xl">
								{categoryName}
							</h1>
							{categoryDescription && (
								<div className="mt-6">
									<HtmlDescription content={categoryDescription} />
								</div>
							)}
						</div>
					</div>
				</div>
			</section>

			{/* Products Section */}
			{products.length > 0 && (
				<section className="mx-auto w-full max-w-[1320px] px-4 py-12 lg:px-6 lg:py-16">
					<div className="mb-8">
						<h2 className="font-display text-3xl font-black text-[var(--tl-metallic-black)]">{t('productsTitle')}</h2>
						<p className="mt-2 text-base text-slate-600">{t('productsCount', { count: products.length })}</p>
					</div>

					<div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
						{products.map((product) => (
							<TestingServiceCard key={product.id} product={product} />
						))}
					</div>
				</section>
			)}
		</main>
	);
}
