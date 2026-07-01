import { getLocale } from 'next-intl/server';
import TestingServicesPage from '@/components/testing-services/TestingServicesPage';
import { fetchProducts } from '@/lib/api';
import { toProductCard } from '@/lib/content-view-models';
import { generateMetadataFor } from '@/lib/seo';

export const generateMetadata = generateMetadataFor('/testing-services');

export default async function TestingServicesRoute({ searchParams }) {
	const [locale, resolvedSearchParams = {}] = await Promise.all([getLocale(), searchParams]);
	const initialSearch = typeof resolvedSearchParams.search === 'string' ? resolvedSearchParams.search : '';

	let products = [];

	try {
		products = await fetchProducts(locale);
	} catch {
		products = [];
	}
	const listingProducts = products.map(toProductCard);

	return (
		<TestingServicesPage
			key={`${locale}:${initialSearch}`}
			products={listingProducts}
			locale={locale}
			initialSearch={initialSearch}
		/>
	);
}
