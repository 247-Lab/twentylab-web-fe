import GenericFormPage from '@/components/forms/GenericFormPage';
import { generateMetadataFor } from '@/lib/seo';

export const generateMetadata = generateMetadataFor('/contact');

export default async function ContactPage({ searchParams }) {
	const resolvedSearchParams = (await searchParams) || {};
	const prefilledMessage = typeof resolvedSearchParams.message === 'string' ? resolvedSearchParams.message.trim() : '';

	return <GenericFormPage formKey="contact" initialValues={prefilledMessage ? { message: prefilledMessage } : {}} />;
}
