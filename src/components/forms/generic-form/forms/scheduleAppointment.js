import { submitAppointmentForm } from '@/lib/api';
import { normalizeDateOnly, normalizePhone, safeT } from '../utils';

export function createScheduleAppointmentConfig(t, optionSets) {
	return {
		layout: 'split',
		description: safeT(t, 'scheduleAppointment.subtitle'),
		submitLabel: safeT(t, 'scheduleAppointment.submitLabel'),
		successMessage: safeT(t, 'scheduleAppointment.successMessage'),
		errorMessage: safeT(t, 'scheduleAppointment.errorMessage'),
		dataNeeds: { locations: true },
		sections: [
			{
				title: safeT(t, 'scheduleAppointment.formTitle'),
				fields: [
					{ name: 'firstname', type: 'text', label: safeT(t, 'common.fields.firstName', 'First Name'), required: true },
					{ name: 'lastname', type: 'text', label: safeT(t, 'common.fields.lastName', 'Last Name'), required: true },
					{
						name: 'email',
						type: 'email',
						label: safeT(t, 'common.fields.email', 'Email'),
						required: true,
						validation: 'email',
					},
					{
						name: 'phone',
						type: 'tel',
						label: safeT(t, 'common.fields.phone', 'Phone Number'),
						required: true,
						validation: 'phone',
					},
					{
						name: 'location',
						type: 'select',
						label: safeT(t, 'common.fields.location', 'Location'),
						required: true,
						placeholder: safeT(t, 'common.selectLocation', 'Select Location'),
						options: optionSets.locations.map((location) => ({
							value: location,
							label: location,
						})),
					},
					{
						name: 'datetime',
						type: 'date',
						label: safeT(t, 'common.fields.dateTime', 'Choose Date'),
						required: true,
						validation: 'date',
					},
					{
						name: 'symptoms',
						type: 'textarea',
						label: safeT(t, 'common.fields.symptomsTests', 'Symptoms / Tests'),
						required: true,
						rows: 6,
						span: 'full',
					},
				],
			},
		],
		buildPayload: (values) => ({
			form_type: 'appointment',
			firstname: values.firstname,
			lastname: values.lastname,
			emailaddress: values.email,
			phonenumber: normalizePhone(values.phone),
			symptoms_tests: values.symptoms,
			datetime: normalizeDateOnly(values.datetime),
			lablocation: values.location,
		}),
		submit: submitAppointmentForm,
	};
}
