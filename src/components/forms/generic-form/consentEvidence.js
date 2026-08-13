import consentManifest from '../../../../config/consent-manifest.json';

export const TERMS_VERSION = consentManifest.activeVersion;

export function normalizeTermsLocale(locale) {
	return String(locale || '')
		.toLowerCase()
		.split('-')[0] === 'es'
		? 'es'
		: 'en';
}

export function buildConsentEvidence(values, locale) {
	return {
		declaration_agreed: values.declaration_agreed === true,
		terms_agreed: values.terms_agreed === true,
		terms_version: TERMS_VERSION,
		terms_locale: normalizeTermsLocale(locale),
	};
}
