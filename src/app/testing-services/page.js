import { cookies } from 'next/headers';
import TestingServicesPage from '@/components/testing-services/TestingServicesPage';
import { fetchProducts } from '@/lib/api';
import { summarizeHtml } from '@/lib/htmlSanitizer';
import { getLocaleFromCookieStore } from '@/lib/locale';
import { generateMetadataFor } from '@/lib/seo';

export const generateMetadata = generateMetadataFor('/testing-services');

export default async function TestingServicesRoute({ searchParams }) {
	const cookieStore = await cookies();
	const locale = getLocaleFromCookieStore(cookieStore);
	const resolvedSearchParams = (await searchParams) || {};
	const initialSearch = typeof resolvedSearchParams.search === 'string' ? resolvedSearchParams.search : '';

	let products = [];

	try {
		products = await fetchProducts(locale);
	} catch {
		products = [];
	}
	const listingProducts = products.map((product) => ({
		...product,
		description: summarizeHtml(product.description, 260),
		variants: product.variants.map((variant) => ({
			id: variant.id,
			name: variant.name,
			regularPrice: variant.regularPrice,
			salePrice: variant.salePrice,
		})),
	}));

	return (
		<TestingServicesPage
			key={`${locale}:${initialSearch}`}
			products={listingProducts}
			locale={locale}
			initialSearch={initialSearch}
		/>
	);
}
