import { summarizeHtml } from '@/lib/htmlSanitizer';

export function toCategoryLink(category) {
	return {
		id: category.id,
		name: category.name,
	};
}

export function toProductCard(product) {
	return {
		id: product.id,
		name: product.name,
		description: summarizeHtml(product.description, 260),
		mainImage: product.mainImage,
		image: product.image,
		regularPrice: product.regularPrice,
		salePrice: product.salePrice,
		categories: product.categories.map(toCategoryLink),
		variants: product.variants.map((variant) => ({
			id: variant.id,
			name: variant.name,
			regularPrice: variant.regularPrice,
			salePrice: variant.salePrice,
		})),
	};
}

export function toBlogCard(blog) {
	return {
		id: blog.id,
		slug: blog.slug,
		title: blog.title,
		author: blog.author,
		blogcontent: summarizeHtml(blog.blogcontent, 260),
		thumbnailimage: blog.thumbnailimage,
		created_at: blog.created_at,
		categories: blog.categories.map(toCategoryLink),
	};
}

export function toRecentPost(blog) {
	return {
		id: blog.id,
		slug: blog.slug,
		title: blog.title,
		created_at: blog.created_at,
	};
}
