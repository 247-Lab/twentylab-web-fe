export const EXPLICIT_LEGACY_REDIRECTS = Object.freeze([
	{ source: '/contact-2', destination: '/contact', permanent: true },
	{ source: '/covid-19-2', destination: '/covid-19', permanent: true },
	{ source: '/privacy-policy-2', destination: '/privacy-policy', permanent: true },
	{ source: '/shop', destination: '/testing-services', permanent: true },
]);

export const LEGACY_REDIRECTS = Object.freeze([...EXPLICIT_LEGACY_REDIRECTS]);
