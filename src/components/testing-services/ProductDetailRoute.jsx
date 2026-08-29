import { getLocale, getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { fetchCategories, fetchProducts } from '@/lib/api';
import { toCategoryLink, toProductCard } from '@/lib/content-view-models';
import { resolveMetadata } from '@/lib/seo';

import TestingServiceDetailsPage from './TestingServiceDetailsPage';
import OptionalContentNotice from '@/components/common/OptionalContentNotice';

export async function generateProductDetailMetadata({ id, canonicalPath }) {
	const [locale, messages] = await Promise.all([getLocale(), getMessages()]);
	let productName = messages?.TestingServiceDetailsPage?.fallbackTitle || 'Service Details';

	try {
		const products = await fetchProducts(locale);
		const match = products.find((product) => String(product.id) === String(id));
		if (match?.name) productName = match.name;
	} catch {
		// Use fallback title when the API is unavailable.
	}

	const metadata = await resolveMetadata(canonicalPath, {
		title: messages?.TestingServiceDetailsPage?.metadata?.title?.replace('{name}', productName),
		description: messages?.TestingServiceDetailsPage?.metadata?.description,
	});
	return {
		...metadata,
		alternates: { ...metadata.alternates, canonical: canonicalPath },
	};
}

export default async function ProductDetailRoute({ id }) {
	const [locale, messages] = await Promise.all([getLocale(), getMessages()]);
	const t = messages?.TestingServiceDetailsPage;
	const [products, allCategories] = await Promise.all([
		fetchProducts(locale),
		fetchCategories(locale).catch(() => null),
	]);

	const product = products.find((entry) => String(entry.id) === String(id));
	if (!product) notFound();

	return (
		<>
			<OptionalContentNotice unavailable={allCategories === null} />
			<TestingServiceDetailsPage
				product={product}
				allProducts={products.map(toProductCard)}
				allCategories={(allCategories || []).map(toCategoryLink)}
				t={t}
				locale={locale}
			/>
		</>
	);
}
