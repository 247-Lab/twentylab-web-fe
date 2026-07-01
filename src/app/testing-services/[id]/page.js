import { getLocale, getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import TestingServiceDetailsPage from '@/components/testing-services/TestingServiceDetailsPage';
import { fetchProducts, fetchCategories } from '@/lib/api';
import { toCategoryLink, toProductCard } from '@/lib/content-view-models';
import { resolveMetadata } from '@/lib/seo';

export async function generateMetadata({ params }) {
	const [locale, messages, resolvedParams] = await Promise.all([getLocale(), getMessages(), params]);
	const id = resolvedParams?.id;

	let productName = messages?.TestingServiceDetailsPage?.fallbackTitle || 'Service Details';

	try {
		const products = await fetchProducts(locale);
		const match = products.find((product) => String(product.id) === String(id));
		if (match?.name) {
			productName = match.name;
		}
	} catch {
		// Use fallback title when API is unavailable.
	}

	return resolveMetadata(`/testing-services/${id}`, {
		title: messages?.TestingServiceDetailsPage?.metadata?.title?.replace('{name}', productName),
		description: messages?.TestingServiceDetailsPage?.metadata?.description,
	});
}

export default async function TestingServiceDetailsRoute({ params }) {
	const [locale, messages, resolvedParams] = await Promise.all([getLocale(), getMessages(), params]);
	const id = resolvedParams?.id;
	const t = messages?.TestingServiceDetailsPage;

	const [products, allCategories] = await Promise.all([
		fetchProducts(locale).catch((error) => {
			console.error('Failed to fetch products:', error);
			return [];
		}),
		fetchCategories(locale).catch((error) => {
			console.error('Failed to fetch categories:', error);
			return [];
		}),
	]);

	const product = products.find((entry) => String(entry.id) === String(id));
	if (!product) {
		notFound();
	}

	return (
		<TestingServiceDetailsPage
			product={product}
			allProducts={products.map(toProductCard)}
			allCategories={allCategories.map(toCategoryLink)}
			t={t}
			locale={locale}
		/>
	);
}
