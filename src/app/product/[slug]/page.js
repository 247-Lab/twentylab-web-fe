import { notFound } from 'next/navigation';

import ProductDetailRoute, { generateProductDetailMetadata } from '@/components/testing-services/ProductDetailRoute';
import { legacyProductRouteForSlug } from '@/lib/productRoutes';

export async function generateMetadata({ params }) {
	const { slug } = await params;
	const route = legacyProductRouteForSlug(slug);
	if (!route) return {};
	return generateProductDetailMetadata({ id: route.productId, canonicalPath: route.path });
}

export default async function CanonicalProductDetailsRoute({ params }) {
	const { slug } = await params;
	const route = legacyProductRouteForSlug(slug);
	if (!route) notFound();
	return <ProductDetailRoute id={route.productId} />;
}
