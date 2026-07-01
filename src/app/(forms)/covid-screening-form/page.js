import GenericFormPage from '@/components/forms/GenericFormPage';
import { generateMetadataFor } from '@/lib/seo';

export const generateMetadata = generateMetadataFor('/covid-screening-form');

export default function CovidScreeningFormPage() {
	return <GenericFormPage formKey="covidScreening" />;
}
