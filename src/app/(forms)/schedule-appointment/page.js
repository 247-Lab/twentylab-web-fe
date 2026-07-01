import GenericFormPage from '@/components/forms/GenericFormPage';
import { generateMetadataFor } from '@/lib/seo';

export const generateMetadata = generateMetadataFor('/schedule-appointment');

export default function ScheduleAppointmentPage() {
	return <GenericFormPage formKey="scheduleAppointment" />;
}
