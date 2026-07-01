import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import TestingServiceDetailsPage from '@/components/testing-services/TestingServiceDetailsPage';
import { fetchProducts, fetchCategories } from '@/lib/api';
import { getLocaleFromCookieStore } from '@/lib/locale';
import { loadMessages } from '@/i18n/loadMessages';
import { resolveMetadata } from '@/lib/seo';

export async function generateMetadata({ params }) {
	const cookieStore = await cookies();
	const locale = getLocaleFromCookieStore(cookieStore);
	const messages = await loadMessages(locale);
	const resolvedParams = await params;
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
	const cookieStore = await cookies();
	const locale = getLocaleFromCookieStore(cookieStore);
	const resolvedParams = await params;
	const id = resolvedParams?.id;
	const messages = await loadMessages(locale);
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
			allProducts={products}
			allCategories={allCategories}
			t={t}
			locale={locale}
		/>
	);
}
