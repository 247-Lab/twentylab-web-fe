import { readFile } from 'node:fs/promises';
import { describe, expect, it, vi } from 'vitest';
import {
	TYPED_SIGNATURE_MAX_LENGTH,
	normalizeTypedSignatureName,
	renderTypedSignaturePng,
} from '../src/components/forms/signaturePng';

describe('accessible typed signature contract', () => {
	it('normalizes a bounded full legal name', () => {
		expect(normalizeTypedSignatureName('  Patient   Example ')).toBe('Patient Example');
		expect(normalizeTypedSignatureName('A')).toBeNull();
		expect(normalizeTypedSignatureName('x'.repeat(TYPED_SIGNATURE_MAX_LENGTH + 1))).toBeNull();
	});

	it('renders an auditable PNG using the existing backend data URL contract', () => {
		const context = {
			fillRect: vi.fn(),
			fillText: vi.fn(),
			measureText: vi.fn(() => ({ width: 200 })),
			beginPath: vi.fn(),
			moveTo: vi.fn(),
			lineTo: vi.fn(),
			stroke: vi.fn(),
		};
		const canvas = {
			width: 750,
			height: 200,
			getContext: () => context,
			toDataURL: vi.fn(() => 'data:image/png;base64,iVBORtyped'),
		};

		expect(renderTypedSignaturePng(canvas, 'Patient Example')).toBe('data:image/png;base64,iVBORtyped');
		expect(context.fillText).toHaveBeenCalledWith('SIGNATURE METHOD: TYPED', 32, 40);
		expect(context.fillText).toHaveBeenCalledWith('Patient Example', 32, 120, 686);
	});

	it('exposes a keyboard-selectable typed-name mode with localized copy', async () => {
		const component = await readFile(new URL('../src/components/forms/SignatureField.jsx', import.meta.url), 'utf8');
		const english = JSON.parse(await readFile(new URL('../locales/en/forms.json', import.meta.url), 'utf8'));
		const spanish = JSON.parse(await readFile(new URL('../locales/es/forms.json', import.meta.url), 'utf8'));

		expect(component).toContain('type="radio"');
		expect(component).toContain('type="text"');
		expect(component).toContain('<fieldset>');
		expect(component).toContain('<legend');
		expect(component).toContain('htmlFor={`${signatureId}-typed-name`}');
		expect(component).toContain('aria-describedby=');
		expect(component).toContain('aria-invalid=');
		expect(component).toContain('role="alert"');
		expect(component).toContain('role="status"');
		expect(component).toContain('applyTypedSignature');
		expect(english.Forms.common.signature.typeMode).toBe('Type signature');
		expect(spanish.Forms.common.signature.typeMode).toBe('Escribir firma');
	});
});
