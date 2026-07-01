import { getLocale, getMessages } from 'next-intl/server';
import { fetchCategories, fetchProducts } from '@/lib/api';
import { toProductCard } from '@/lib/content-view-models';
import CategoryDetailPage from '@/components/categories/CategoryDetailPage';
import { resolveMetadata } from '@/lib/seo';

export async function generateMetadata({ params }) {
	const [{ id }, messages] = await Promise.all([params, getMessages()]);

	// Always fetch English categories to get English name for metadata
	const categories = await fetchCategories('en');
	const category = categories.find((cat) => String(cat.id) === String(id));

	const categoryName = category?.name || messages?.CategoryDetailPage?.fallbackTitle || 'Category Details';

	return resolveMetadata(`/categories/${id}`, {
		title: messages?.CategoryDetailPage?.metadata?.title?.replace('{name}', categoryName),
		description: messages?.CategoryDetailPage?.metadata?.description,
	});
}

export default async function CategoryRoute({ params }) {
	const [{ id }, locale] = await Promise.all([params, getLocale()]);

	const [categories, allProducts] = await Promise.all([fetchCategories(locale), fetchProducts(locale)]);

	const category = categories.find((cat) => String(cat.id) === String(id));

	if (!category) {
		return (
			<div className="flex min-h-screen items-center justify-center">
				<p>Category not found</p>
			</div>
		);
	}

	const categoryProducts = allProducts
		.filter((product) => product.categories.some((cat) => String(cat.id) === String(id)))
		.map(toProductCard);

	return <CategoryDetailPage category={category} products={categoryProducts} />;
}
