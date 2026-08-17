export const INDEXABLE_STATIC_ROUTES = [
	{ path: '/', source: 'page.js', title: 'Home', description: 'Diagnostic and testing services in Tampa.' },
	{ path: '/about', source: 'about/page.js', title: 'About', description: 'About 24-7 Labs.' },
	{
		path: '/allergy-testing',
		source: '(testing)/allergy-testing/page.js',
		title: 'Allergy Testing',
		description: 'Allergy testing services.',
	},
	{ path: '/blogs', source: 'blogs/page.js', title: 'Blogs', description: 'Health and laboratory articles.' },
	{
		path: '/business-opportunities',
		source: '(business)/business-opportunities/page.js',
		title: 'Business Opportunities',
		description: 'Business opportunities with 24-7 Labs.',
	},
	{
		path: '/business-solutions',
		source: '(business)/business-solutions/page.js',
		title: 'Business Solutions',
		description: 'Laboratory solutions for businesses.',
	},
	{ path: '/contact', source: '(forms)/contact/page.js', title: 'Contact', description: 'Contact 24-7 Labs.' },
	{ path: '/covid-19', source: 'covid-19/page.js', title: 'COVID-19', description: 'COVID-19 testing information.' },
	{
		path: '/dna-testing',
		source: '(testing)/dna-testing/page.js',
		title: 'DNA Testing',
		description: 'DNA testing services.',
	},
	{
		path: '/drug-testing',
		source: '(testing)/drug-testing/page.js',
		title: 'Drug Testing',
		description: 'Drug testing services.',
	},
	{
		path: '/heart-testing',
		source: '(testing)/heart-testing/page.js',
		title: 'Heart Testing',
		description: 'Heart health testing services.',
	},
	{
		path: '/hormone-testing',
		source: '(testing)/hormone-testing/page.js',
		title: 'Hormone Testing',
		description: 'Hormone testing services.',
	},
	{
		path: '/privacy-policy',
		source: '(business)/privacy-policy/page.js',
		title: 'Privacy Policy',
		description: '24-7 Labs privacy policy.',
	},
	{
		path: '/routine-health-testing',
		source: '(testing)/routine-health-testing/page.js',
		title: 'Routine Health Testing',
		description: 'Routine health testing services.',
	},
	{
		path: '/std-testing',
		source: '(testing)/std-testing/page.js',
		title: 'STD Testing',
		description: 'Confidential STD testing services.',
	},
	{
		path: '/telemedicine',
		source: '(business)/telemedicine/page.js',
		title: 'Telemedicine',
		description: 'Telemedicine services.',
	},
	{
		path: '/testing-services',
		source: 'testing-services/page.js',
		title: 'Testing Services',
		description: 'Available laboratory testing services.',
	},
	{
		path: '/trust-standards',
		source: 'trust-standards/page.js',
		title: 'Trust and Standards',
		description: 'Quality and trust standards at 24-7 Labs.',
	},
];

export const SENSITIVE_NOINDEX_ROUTES = [
	'/checkout',
	'/schedule-appointment',
	'/patient-intake-form',
	'/covid-screening-form',
	'/prescription-consent-form',
];
