// Human-reviewed semantic aliases backed by config/legacy-page-alias-evidence.json.
// Keep source paths in their exact WordPress sitemap form; runtime normalization
// removes the trailing slash before lookup.
export const LEGACY_PAGE_ALIASES = Object.freeze([
	{
		source: '/about-us/',
		destination: '/about',
		matchBasis: 'renamed_company_page',
	},
	{
		source: '/accreditation-and-certifications/',
		destination: '/trust-standards',
		matchBasis: 'renamed_trust_page',
	},
	{
		source: '/allergy-testing-service/',
		destination: '/allergy-testing',
		matchBasis: 'renamed_service_page',
	},
	{
		source: '/blog/',
		destination: '/blogs',
		matchBasis: 'renamed_listing_page',
	},
	{
		source: '/business-opportunities-old/',
		destination: '/business-opportunities',
		matchBasis: 'renamed_company_page',
	},
	{
		source: '/dna-testing-services/',
		destination: '/dna-testing',
		matchBasis: 'renamed_service_page',
	},
	{
		source: '/drug-alcohol-testing/',
		destination: '/drug-testing',
		matchBasis: 'renamed_service_page',
	},
	{
		source: '/prescription-medication-consent-form/',
		destination: '/prescription-consent-form',
		matchBasis: 'renamed_form_page',
	},
	{
		source: '/privacy/',
		destination: '/privacy-policy',
		matchBasis: 'renamed_policy_page',
	},
	{
		source: '/schedule-appointment-after-hours/',
		destination: '/schedule-appointment',
		matchBasis: 'renamed_form_page',
	},
	{
		source: '/shop-2/',
		destination: '/testing-services',
		matchBasis: 'renamed_listing_page',
	},
	{
		source: '/shop/',
		destination: '/testing-services',
		matchBasis: 'renamed_listing_page',
	},
	{
		source: '/telemedicine-service/',
		destination: '/telemedicine',
		matchBasis: 'renamed_company_page',
	},
]);
