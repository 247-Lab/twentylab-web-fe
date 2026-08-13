import GenericFormPage from '@/components/forms/GenericFormPage';
import { generateScheduleAppointmentMetadata } from './metadata';

export const generateMetadata = generateScheduleAppointmentMetadata;

export default function ScheduleAppointmentPage() {
	return <GenericFormPage formKey="scheduleAppointment" />;
}
