'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';

export default function PageError({ reset }) {
	const t = useTranslations('ErrorPage');
	return (
		<main className="mx-auto max-w-2xl px-4 py-16">
			<h1 className="text-3xl font-bold">{t('title')}</h1>
			<p role="alert" className="mt-4 text-slate-700">
				{t('message')}
			</p>
			<button
				type="button"
				onClick={reset}
				className="mt-6 rounded-full bg-[var(--tl-primary)] px-6 py-3 font-semibold text-white"
			>
				{t('retry')}
			</button>
			<p className="mt-4 text-sm text-slate-700">{t('submissionCaution')}</p>
			<Link href="/contact" className="mt-4 inline-block font-semibold underline">
				{t('contact')}
			</Link>
		</main>
	);
}
