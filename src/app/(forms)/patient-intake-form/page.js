import GenericFormPage from '@/components/forms/GenericFormPage';
import { generateMetadataFor } from '@/lib/seo';

export const generateMetadata = generateMetadataFor('/patient-intake-form');

export default function PatientIntakeFormPage() {
	return <GenericFormPage formKey="patientIntake" />;
}
