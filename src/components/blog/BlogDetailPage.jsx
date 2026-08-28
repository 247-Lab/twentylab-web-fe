'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { CalendarDays, ChevronLeft } from 'lucide-react';

import { formatBlogDate } from '@/lib/blog-content';
import { toCanonicalBlogPath } from '@/lib/blogRoutes';
import BlogContentRenderer from './BlogContentRenderer';
import RelatedProductsSection from '@/components/common/RelatedProductsSection';
import TestingServiceCard from '@/components/testing-services/components/TestingServiceCard';

export default function BlogDetailPage({
	blog,
	categories = [],
	recentPosts = [],
	relatedProducts = [],
	locale = 'en',
}) {
	const t = useTranslations('BlogDetailPage');
	return (
		<main className="min-h-screen bg-[linear-gradient(180deg,#eff6ff_0%,#ffffff_45%,#f6faff_100%)] text-[var(--tl-ink)]">
			<section className="mx-auto w-full max-w-[1320px] px-4 pt-10 pb-8 lg:px-6">
				<Link
					href="/blogs"
					className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-[var(--tl-primary)] hover:text-[var(--tl-primary)]"
				>
					<ChevronLeft className="h-4 w-4" />
					{t('backToBlogs')}
				</Link>
			</section>

			<section className="mx-auto grid w-full max-w-[1320px] gap-8 px-4 pb-14 lg:grid-cols-[1fr_320px] lg:px-6 lg:pb-16">
				<article className="overflow-hidden rounded-[1.9rem] border border-sky-100 bg-white shadow-[0_26px_65px_-48px_rgba(2,6,14,0.9)]">
					<div className="relative h-[280px] md:h-[360px]">
						<Image
							src={blog.thumbnailimage || '/images/placeholder.png'}
							alt={blog.title || t('cardImageAlt')}
							fill
							sizes="(min-width: 768px) 960px, 100vw"
							className="h-full w-full object-cover"
						/>
					</div>

					<div className="p-6 md:p-9">
						<div className="mb-4 flex flex-wrap gap-2">
							{(blog.categories || []).map((category) => (
								<span
									key={`${blog.id}-${category.id}`}
									className="rounded-full bg-sky-50 px-3 py-1 text-[11px] font-bold tracking-[0.08em] text-[var(--tl-primary)] uppercase"
								>
									{category.name}
								</span>
							))}
						</div>

						<h1 className="font-display text-3xl leading-tight font-black text-[var(--tl-metallic-black)] md:text-4xl">
							{blog.title}
						</h1>
						<p className="mt-3 flex flex-wrap items-center gap-4 text-xs font-semibold tracking-wide text-slate-500 uppercase">
							<span>{t('byLabel', { author: blog.author || t('brandName') })}</span>
							<span className="inline-flex items-center gap-1">
								<CalendarDays className="h-3.5 w-3.5" />
								{formatBlogDate(blog.created_at, locale)}
							</span>
						</p>

						<div className="mt-8">
							<BlogContentRenderer content={blog.blogcontent} imageAltFallback={t('contentImageAlt')} />
						</div>
					</div>
				</article>

				<aside className="space-y-5">
					<section className="rounded-[1.5rem] border border-sky-100 bg-white p-5 shadow-[0_18px_50px_-42px_rgba(2,6,14,0.9)]">
						<h3 className="font-display text-xl font-black text-[var(--tl-metallic-black)]">{t('recentPosts')}</h3>
						<ul className="mt-4 space-y-4">
							{recentPosts.map((post) => (
								<li key={`recent-${post.id}`} className="border-b border-sky-100 pb-3 last:border-b-0 last:pb-0">
									<Link
										href={toCanonicalBlogPath(post.slug)}
										className="text-sm font-bold text-slate-700 transition hover:text-[var(--tl-primary)]"
									>
										{post.title}
									</Link>
									<p className="mt-1 text-xs text-slate-500">{formatBlogDate(post.created_at, locale)}</p>
								</li>
							))}
						</ul>
					</section>

					<section className="rounded-[1.5rem] border border-sky-100 bg-white p-5 shadow-[0_18px_50px_-42px_rgba(2,6,14,0.9)]">
						<h3 className="font-display text-xl font-black text-[var(--tl-metallic-black)]">{t('categories')}</h3>
						<ul className="mt-4 space-y-2">
							{categories.map((category) => (
								<li key={`category-${category.id}`}>
									<Link
										href={`/categories/${category.id}`}
										className="flex items-center justify-between rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-sky-50 hover:text-[var(--tl-primary)]"
									>
										<span>{category.name}</span>
									</Link>
								</li>
							))}
						</ul>
					</section>
				</aside>
			</section>

			<section className="mx-auto w-full max-w-[1320px] px-4 pb-16 lg:px-6 lg:pb-20">
				<RelatedProductsSection
					title={t('relatedProducts')}
					items={relatedProducts}
					renderItem={(relatedProduct) => <TestingServiceCard product={relatedProduct} />}
				/>
			</section>
		</main>
	);
}
