import { LEGACY_PAGE_ALIASES } from './legacyPageAliases.mjs';

export const EXPLICIT_LEGACY_REDIRECTS = Object.freeze([
	{ source: '/contact-2', destination: '/contact', permanent: true },
	{ source: '/covid-19-2', destination: '/covid-19', permanent: true },
	{ source: '/privacy-policy-2', destination: '/privacy-policy', permanent: true },
]);

export const LEGACY_PAGE_ALIAS_REDIRECTS = Object.freeze(
	LEGACY_PAGE_ALIASES.map(({ source, destination }) => ({ source, destination, permanent: true }))
);

export const LEGACY_REDIRECTS = Object.freeze([...EXPLICIT_LEGACY_REDIRECTS, ...LEGACY_PAGE_ALIAS_REDIRECTS]);
