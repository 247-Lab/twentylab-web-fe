import { notFound, permanentRedirect } from 'next/navigation';
import { toCanonicalBlogPath } from '@/lib/blogRoutes';

export default async function LegacyAppBlogDetailsRoute({ params }) {
	const resolvedParams = await params;
	let destination;
	try {
		destination = toCanonicalBlogPath(resolvedParams?.slug);
	} catch {
		notFound();
	}
	permanentRedirect(destination);
}
