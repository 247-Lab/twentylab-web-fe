import { permanentRedirect } from 'next/navigation';

import ProductDetailRoute, { generateProductDetailMetadata } from '@/components/testing-services/ProductDetailRoute';
import { canonicalProductPathForId } from '@/lib/productRoutes';

export async function generateMetadata({ params }) {
	const { id } = await params;
	return generateProductDetailMetadata({
		id,
		canonicalPath: canonicalProductPathForId(id) ?? `/testing-services/${id}`,
	});
}

export default async function TestingServiceDetailsRoute({ params }) {
	const { id } = await params;
	const canonicalPath = canonicalProductPathForId(id);
	if (canonicalPath) permanentRedirect(canonicalPath);
	return <ProductDetailRoute id={id} />;
}
