// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import english from '../locales/en/forms.json';
import { FormSubmissionError } from '../src/lib/formFeedback';
import { submitContactForm } from '../src/lib/api';
import GenericFormPage from '../src/components/forms/GenericFormPage';
import FormFieldRenderer from '../src/components/forms/generic-form/FormFieldRenderer';

vi.mock('next-intl', () => ({ useLocale: () => 'en', useTranslations: () => translate }));
vi.mock('../src/lib/api', () => ({
	submitContactForm: vi.fn(),
	submitAppointmentForm: vi.fn(),
	submitPatientIntakeForm: vi.fn(),
	submitPrescriptionConsentForm: vi.fn(),
	submitCovidScreeningForm: vi.fn(),
}));
function translate(key, values = {}) {
	let result = key.split('.').reduce((value, part) => value?.[part], english.Forms) ?? key;
	for (const [name, value] of Object.entries(values))
		if (typeof result === 'string') result = result.replace(`{${name}}`, value);
	return result;
}
translate.raw = translate;
globalThis.React = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let container;
let root;
const initialValues = {
	firstname: 'Synthetic',
	lastname: 'Example',
	email: 'synthetic@example.test',
	phone: '2155550100',
	message: 'Synthetic inquiry',
};
beforeEach(async () => {
	vi.clearAllMocks();
	container = document.createElement('div');
	document.body.appendChild(container);
	root = createRoot(container);
});
afterEach(async () => {
	await act(async () => root.unmount());
	container.remove();
});
async function render(values = initialValues) {
	await act(async () =>
		root.render(React.createElement(GenericFormPage, { formKey: 'contact', initialValues: values }))
	);
}
async function submit() {
	await act(async () =>
		container.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
	);
}

it('associates errors with fields and focuses the first invalid field', async () => {
	await render({});
	await submit();
	const first = container.querySelector('[name="firstname"]');
	expect(first?.getAttribute('aria-invalid')).toBe('true');
	expect(document.getElementById(first.getAttribute('aria-describedby')).textContent).toContain('required');
	expect(document.activeElement).toBe(first);
	expect(submitContactForm).not.toHaveBeenCalled();
});
it('preserves answers and blocks repeat submission when receipt is uncertain', async () => {
	submitContactForm.mockRejectedValue(new FormSubmissionError('uncertain', '123e4567-e89b-42d3-a456-426614174000'));
	await render();
	await submit();
	expect(container.querySelector('[role="alert"]').textContent).toMatch(/Do not submit again/);
	expect(container.querySelector('input[name="email"]').value).toBe(initialValues.email);
	expect(container.querySelector('button[type="submit"]').disabled).toBe(true);
	await submit();
	expect(submitContactForm).toHaveBeenCalledTimes(1);
});
it('shows a persisted form receipt, without claiming notification delivery', async () => {
	submitContactForm.mockResolvedValue({ id: 17, submitted: true, form_type: 'contact' });
	await render();
	await submit();
	expect(container.querySelector('[role="status"]').textContent).toContain('17');
	expect(container.querySelector('[role="status"]').textContent).toContain('received');
	expect(container.querySelector('[role="status"]').textContent).not.toContain('delivered');
});

it('associates a signature error with a focusable signature group', () => {
	const markup = renderToStaticMarkup(
		React.createElement(FormFieldRenderer, {
			field: { name: 'digital_signature', type: 'signature', label: 'Signature', required: true },
			fieldId: 'form-consent-digital_signature',
			value: '',
			fieldError: 'Sign before submitting.',
			values: {},
			t: translate,
			onChange: vi.fn(),
		})
	);
	expect(markup).toContain('role="group"');
	expect(markup).toContain('data-field-invalid="true"');
	expect(markup).toContain('aria-describedby="form-consent-digital_signature-error"');
	expect(markup).toContain('id="form-consent-digital_signature-error"');
});
