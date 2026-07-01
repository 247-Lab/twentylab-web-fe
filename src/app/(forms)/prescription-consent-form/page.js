import GenericFormPage from '@/components/forms/GenericFormPage';
import { generateMetadataFor } from '@/lib/seo';

export const generateMetadata = generateMetadataFor('/prescription-consent-form');

export default function PrescriptionConsentFormPage() {
	return <GenericFormPage formKey="prescriptionConsent" />;
}
