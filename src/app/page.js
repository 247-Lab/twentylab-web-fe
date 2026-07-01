import HomePage from '@/components/home/HomePage';
import { generateMetadataFor } from '@/lib/seo';

export const generateMetadata = generateMetadataFor('/');

export default function Home() {
	return <HomePage />;
}
