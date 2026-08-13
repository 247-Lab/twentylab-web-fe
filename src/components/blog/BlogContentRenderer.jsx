import { parseBlogContent, resolveBlogImageUrl } from '@/lib/blog-content';
import { sanitizeCmsHtml } from '@/lib/htmlSanitizer';

function renderList(block, type = 'ul') {
	const items = Array.isArray(block?.data?.items) ? block.data.items : [];
	if (items.length === 0) {
		return null;
	}

	const ListTag = type;
	return (
		<ListTag className="mt-5 space-y-2 pl-6 text-slate-700 marker:text-[var(--tl-primary)]">
			{items.map((item, index) => (
				<li key={`${block.id || block.type}-${index}`} dangerouslySetInnerHTML={{ __html: sanitizeCmsHtml(item) }} />
			))}
		</ListTag>
	);
}

export default function BlogContentRenderer({ content, imageAltFallback }) {
	const parsed = parseBlogContent(content);
	const blocks = Array.isArray(parsed?.blocks) ? parsed.blocks : [];

	return (
		<article className="blog-content text-[1.02rem] leading-8 text-slate-700">
			{blocks.map((block, index) => {
				const key = block?.id || `${block?.type || 'block'}-${index}`;

				switch (block?.type) {
					case 'heading': {
						const level = Math.min(Math.max(Number(block?.data?.level) || 2, 1), 6);
						const Tag = `h${level}`;
						const sizeMap = {
							1: 'mt-10 text-4xl',
							2: 'mt-10 text-3xl',
							3: 'mt-8 text-2xl',
							4: 'mt-7 text-xl',
							5: 'mt-6 text-lg',
							6: 'mt-6 text-base',
						};

						return (
							<Tag
								key={key}
								className={`font-display font-extrabold text-[var(--tl-metallic-black)] ${sizeMap[level]}`}
								dangerouslySetInnerHTML={{ __html: sanitizeCmsHtml(block?.data?.text) }}
							/>
						);
					}

					case 'paragraph':
						return (
							<p
								key={key}
								className="mt-5 text-slate-700"
								dangerouslySetInnerHTML={{ __html: sanitizeCmsHtml(block?.data?.text) }}
							/>
						);

					case 'image': {
						const raw = block?.data?.src?.src || block?.data?.src || '';
						const src = resolveBlogImageUrl(String(raw));
						const alt = block?.data?.caption || block?.data?.alt || imageAltFallback;

						return (
							<figure
								key={key}
								className="mt-8 overflow-hidden rounded-2xl border border-sky-100 bg-white p-3 shadow-sm"
							>
								{/* Dynamic CMS content image with unknown dimensions; keep native img for fidelity. */}
								{/* eslint-disable-next-line @next/next/no-img-element */}
								<img src={src} alt={alt} className="w-full rounded-xl object-cover" loading="lazy" />
								{block?.data?.caption ? (
									<figcaption className="mt-3 text-center text-sm text-slate-500">{block.data.caption}</figcaption>
								) : null}
							</figure>
						);
					}

					case 'bulleted-list':
						return <div key={key}>{renderList(block, 'ul')}</div>;

					case 'numbered-list':
						return <div key={key}>{renderList(block, 'ol')}</div>;

					case 'quote':
						return (
							<blockquote
								key={key}
								className="mt-8 rounded-2xl border border-sky-100 bg-[linear-gradient(125deg,#f5f9ff_0%,#ffffff_72%)] px-6 py-5 text-slate-700 shadow-[0_14px_36px_-30px_rgba(2,6,14,0.8)]"
							>
								<p
									className="text-lg italic"
									dangerouslySetInnerHTML={{ __html: sanitizeCmsHtml(block?.data?.text) }}
								/>
								{block?.data?.caption ? (
									<cite className="mt-2 block text-sm font-semibold text-[var(--tl-primary)] not-italic">
										{block.data.caption}
									</cite>
								) : null}
							</blockquote>
						);

					case 'code':
						return (
							<div key={key} className="mt-8 overflow-hidden rounded-2xl border border-slate-800 bg-slate-950">
								<pre className="overflow-x-auto p-5 text-sm text-slate-200">
									<code>{block?.data?.code || ''}</code>
								</pre>
							</div>
						);

					case 'legacy-html':
						return (
							<div
								key={key}
								className="blog-legacy mt-4"
								dangerouslySetInnerHTML={{ __html: sanitizeCmsHtml(block?.data?.html) }}
							/>
						);

					default:
						if (block?.data?.text) {
							return (
								<p key={key} className="mt-5 text-slate-700">
									{block.data.text}
								</p>
							);
						}
						return null;
				}
			})}
		</article>
	);
}
