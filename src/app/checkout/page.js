import CheckoutPage from '@/components/checkout/CheckoutPage';
import { generateMetadataFor } from '@/lib/seo';

export const generateMetadata = generateMetadataFor('/checkout');

export default function CheckoutRoute() {
	return <CheckoutPage />;
}
