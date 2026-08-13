'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useDeferredValue, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { CalendarDays, Search } from 'lucide-react';
import { extractBlogSnippet, formatBlogDate } from '@/lib/blog-content';

const ITEMS_PER_PAGE = 6;

export default function BlogListPage({ blogs = [], categories = [], locale = 'en', initialCategory = 'all' }) {
	const t = useTranslations('BlogListPage');
	const [searchTerm, setSearchTerm] = useState('');
	const [selectedCategoryId, setSelectedCategoryId] = useState(String(initialCategory || 'all'));
	const [currentPage, setCurrentPage] = useState(1);
	const deferredSearch = useDeferredValue(searchTerm.trim().toLowerCase());

	const orderedBlogs = useMemo(
		() =>
			[...blogs].sort((left, right) => {
				const leftTime = new Date(left.created_at || 0).valueOf();
				const rightTime = new Date(right.created_at || 0).valueOf();
				return rightTime - leftTime;
			}),
		[blogs]
	);

	const categoryOptions = useMemo(() => {
		const map = new Map();
		categories.forEach((category) => {
			if (!category?.id) {
				return;
			}
			map.set(String(category.id), {
				id: String(category.id),
				name: category.name,
				count: orderedBlogs.filter((blog) =>
					(blog.categories || []).some((item) => String(item.id) === String(category.id))
				).length,
			});
		});

		return Array.from(map.values()).sort((left, right) =>
			String(left.name || '').localeCompare(String(right.name || ''), locale === 'es' ? 'es' : 'en')
		);
	}, [categories, locale, orderedBlogs]);

	const filteredBlogs = useMemo(() => {
		let result = orderedBlogs;

		if (selectedCategoryId !== 'all') {
			result = result.filter((blog) =>
				(blog.categories || []).some((category) => String(category.id) === selectedCategoryId)
			);
		}

		if (!deferredSearch) {
			return result;
		}

		return result.filter((blog) => {
			const haystack = [
				blog.title,
				extractBlogSnippet(blog.blogcontent, 240),
				(blog.categories || []).map((c) => c.name).join(' '),
			]
				.join(' ')
				.toLowerCase();
			return haystack.includes(deferredSearch);
		});
	}, [deferredSearch, orderedBlogs, selectedCategoryId]);

	const totalPages = Math.max(1, Math.ceil(filteredBlogs.length / ITEMS_PER_PAGE));
	const safePage = Math.min(currentPage, totalPages);
	const visibleBlogs = filteredBlogs.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE);
	const recentPosts = orderedBlogs.slice(0, 3);

	return (
		<main className="min-h-screen bg-[linear-gradient(180deg,#eff6ff_0%,#ffffff_45%,#f6faff_100%)] text-[var(--tl-ink)]">
			<section className="mx-auto w-full max-w-[1320px] px-4 pt-12 pb-8 lg:px-6">
				<p className="text-xs font-bold tracking-[0.18em] text-[var(--tl-primary)] uppercase">{t('eyebrow')}</p>
				<h1 className="font-display mt-3 max-w-3xl text-4xl leading-tight font-black text-[var(--tl-metallic-black)] md:text-5xl">
					{t('title')}
				</h1>
				<p className="mt-4 max-w-3xl text-base leading-relaxed text-slate-600 md:text-lg">{t('description')}</p>
			</section>

			<section className="mx-auto grid w-full max-w-[1320px] gap-8 px-4 pb-14 lg:grid-cols-[1fr_320px] lg:px-6 lg:pb-16">
				<div>
					<div className="rounded-[1.7rem] border border-sky-100 bg-white p-4 shadow-[0_20px_55px_-44px_rgba(2,6,14,0.9)] md:p-5">
						<div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
							<label className="relative block w-full md:max-w-lg">
								<Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
								<input
									type="text"
									value={searchTerm}
									onChange={(event) => {
										setSearchTerm(event.target.value);
										setCurrentPage(1);
									}}
									placeholder={t('searchPlaceholder')}
									className="h-11 w-full rounded-full border border-sky-100 bg-[#f8fbff] pr-4 pl-10 text-sm font-semibold text-slate-700 transition outline-none focus:border-[var(--tl-primary)] focus:bg-white"
								/>
							</label>
							<p className="text-sm font-semibold text-slate-500">
								{t('resultsCount', { count: filteredBlogs.length })}
							</p>
						</div>

						<div className="mt-4 flex flex-wrap gap-2">
							<button
								type="button"
								onClick={() => {
									setSelectedCategoryId('all');
									setCurrentPage(1);
								}}
								className={`rounded-full px-4 py-2 text-xs font-bold tracking-wide uppercase transition ${
									selectedCategoryId === 'all'
										? 'bg-[var(--tl-primary)] text-white'
										: 'bg-sky-50 text-[var(--tl-primary-strong)] hover:bg-sky-100'
								}`}
							>
								{t('allCategories')}
							</button>
							{categoryOptions.map((category) => (
								<Link
									key={category.id}
									href={`/categories/${category.id}`}
									className="rounded-full bg-sky-50 px-4 py-2 text-xs font-bold tracking-wide text-[var(--tl-primary-strong)] uppercase transition hover:bg-sky-100"
								>
									{category.name} ({category.count})
								</Link>
							))}
						</div>
					</div>

					<div className="mt-6 space-y-6">
						{visibleBlogs.map((post) => (
							<article
								key={post.id}
								className="group overflow-hidden rounded-[1.7rem] border border-sky-100 bg-white shadow-[0_24px_60px_-45px_rgba(2,6,14,0.85)] transition hover:-translate-y-1 hover:shadow-[0_34px_70px_-42px_rgba(2,6,14,0.9)]"
							>
								<div className="grid gap-0 md:grid-cols-[300px_1fr]">
									<div className="relative h-56 md:h-full">
										<Image
											src={post.thumbnailimage || '/images/placeholder.png'}
											alt={post.title || t('cardImageAlt')}
											fill
											sizes="(min-width: 768px) 300px, 100vw"
											className="h-full w-full object-cover"
										/>
									</div>
									<div className="p-5 md:p-7">
										<div className="mb-3 flex flex-wrap gap-2">
											{(post.categories || []).map((category) => (
												<span
													key={`${post.id}-${category.id}`}
													className="rounded-full bg-sky-50 px-3 py-1 text-[11px] font-bold tracking-[0.08em] text-[var(--tl-primary)] uppercase"
												>
													{category.name}
												</span>
											))}
										</div>

										<h2 className="font-display text-2xl leading-tight font-black text-[var(--tl-metallic-black)]">
											{post.title}
										</h2>

										<p className="mt-2 flex flex-wrap items-center gap-3 text-xs font-semibold tracking-wide text-slate-500 uppercase">
											<span>{t('byLabel', { author: post.author || t('brandName') })}</span>
											<span className="inline-flex items-center gap-1">
												<CalendarDays className="h-3.5 w-3.5" />
												{formatBlogDate(post.created_at, locale)}
											</span>
										</p>

										<p className="mt-4 text-sm leading-relaxed text-slate-600">
											{extractBlogSnippet(post.blogcontent, 210)}
										</p>

										<Link
											href={`/blogs/${post.slug}`}
											className="mt-5 inline-flex items-center rounded-full bg-[var(--tl-primary)] px-4 py-2 text-sm font-bold text-white transition hover:bg-[var(--tl-primary-strong)]"
										>
											{t('readArticle')}
										</Link>
									</div>
								</div>
							</article>
						))}

						{visibleBlogs.length === 0 ? (
							<div className="rounded-2xl border border-sky-100 bg-white p-8 text-center text-slate-600 shadow-sm">
								{t('emptyState')}
							</div>
						) : null}

						{totalPages > 1 ? (
							<div className="mt-8 flex flex-col items-center gap-3">
								<nav
									aria-label={t('paginationAria')}
									className="flex items-center gap-2 rounded-full border border-sky-100 bg-white/90 p-2 shadow-sm"
								>
									<button
										type="button"
										onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
										disabled={safePage === 1}
										className="inline-flex h-10 items-center rounded-full px-4 text-sm font-semibold text-slate-700 transition hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-40"
									>
										{t('previous')}
									</button>

									<span className="min-w-16 px-2 text-center text-sm font-semibold text-slate-700">
										{safePage} / {totalPages}
									</span>

									<button
										type="button"
										onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
										disabled={safePage === totalPages}
										className="inline-flex h-10 items-center rounded-full px-4 text-sm font-semibold text-slate-700 transition hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-40"
									>
										{t('next')}
									</button>
								</nav>
							</div>
						) : null}
					</div>
				</div>

				<aside className="space-y-5">
					<section className="rounded-[1.5rem] border border-sky-100 bg-white p-5 shadow-[0_18px_50px_-42px_rgba(2,6,14,0.9)]">
						<h3 className="font-display text-xl font-black text-[var(--tl-metallic-black)]">{t('recentPosts')}</h3>
						<ul className="mt-4 space-y-4">
							{recentPosts.map((post) => (
								<li key={`recent-${post.id}`} className="border-b border-sky-100 pb-3 last:border-b-0 last:pb-0">
									<Link
										href={`/blogs/${post.slug}`}
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
							{categoryOptions.map((category) => (
								<li key={`widget-${category.id}`}>
									<Link
										href={`/categories/${category.id}`}
										className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-semibold text-slate-700 transition hover:bg-sky-50 hover:text-[var(--tl-primary)]"
									>
										<span>{category.name}</span>
										<span className="text-xs text-slate-500">{category.count}</span>
									</Link>
								</li>
							))}
						</ul>
					</section>
				</aside>
			</section>
		</main>
	);
}
