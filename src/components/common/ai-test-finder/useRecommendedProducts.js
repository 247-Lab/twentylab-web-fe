import { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import { fetchProducts } from '@/lib/api';
import { getDisplayPrice } from './utils';

function toRecommendation(product) {
	return {
		id: product.id,
		image: product.mainImage,
		name: product.name ?? null,
		price: getDisplayPrice(product),
	};
}

export default function useRecommendedProducts({ isOpen, step, selectedProductIds }) {
	const locale = useLocale();
	const [isLoadingProducts, setIsLoadingProducts] = useState(false);
	const [recommendedProducts, setRecommendedProducts] = useState([]);
	const [loadFailed, setLoadFailed] = useState(false);
	const [retrySequence, setRetrySequence] = useState(0);

	useEffect(() => {
		if (!isOpen || step !== 5) {
			return;
		}

		if (selectedProductIds.length === 0) {
			setRecommendedProducts([]);
			setLoadFailed(false);
			return;
		}

		let isActive = true;

		const loadRecommendedProducts = async () => {
			setIsLoadingProducts(true);
			setLoadFailed(false);

			try {
				const products = await fetchProducts(locale);
				if (!isActive) {
					return;
				}

				const productById = new Map(products.map((product) => [String(product.id), product]));
				const orderedRecommendations = selectedProductIds.map((id) => {
					const match = productById.get(String(id));
					if (!match) throw new Error('Recommendation catalog is incomplete');
					return toRecommendation(match);
				});

				setRecommendedProducts(orderedRecommendations);
			} catch {
				if (!isActive) {
					return;
				}

				setRecommendedProducts([]);
				setLoadFailed(true);
			} finally {
				if (isActive) {
					setIsLoadingProducts(false);
				}
			}
		};

		loadRecommendedProducts();

		return () => {
			isActive = false;
		};
	}, [isOpen, locale, retrySequence, selectedProductIds, step]);

	const resetRecommendedProducts = () => {
		setRecommendedProducts([]);
		setIsLoadingProducts(false);
		setLoadFailed(false);
	};

	return {
		isLoadingProducts,
		loadFailed,
		recommendedProducts,
		retryRecommendedProducts: () => setRetrySequence((value) => value + 1),
		resetRecommendedProducts,
	};
}
