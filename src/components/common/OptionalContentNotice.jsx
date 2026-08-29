'use client';
import { useTranslations } from 'next-intl';

export default function OptionalContentNotice({ unavailable }) {
	const t = useTranslations('ErrorPage');
	if (!unavailable) return null;
	return (
		<aside
			role="status"
			className="mx-auto max-w-5xl rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-950"
		>
			{t('relatedUnavailable')}{' '}
			<button type="button" className="font-semibold underline" onClick={() => window.location.reload()}>
				{t('retry')}
			</button>
		</aside>
	);
}
