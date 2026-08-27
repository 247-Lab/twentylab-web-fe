function httpOrigin(value) {
	try {
		const url = new URL(value);
		const isOriginOnly = url.pathname === '/' && !url.search && !url.hash;
		return ['http:', 'https:'].includes(url.protocol) && isOriginOnly ? url.origin : null;
	} catch {
		return null;
	}
}

const AUTHORIZE_NET_BROWSER_ORIGINS = Object.freeze({
	sandbox: 'https://jstest.authorize.net',
	production: 'https://js.authorize.net',
});

function publicValue(environment, name) {
	const value = environment[name];
	if (typeof value !== 'string' || !value.trim() || value.length > 256 || /[\u0000-\u001f\u007f]/u.test(value)) {
		throw new Error(`${name} must be a non-empty public browser value`);
	}
	return value.trim();
}

export function resolveAuthorizeNetBrowserConfig(environment = process.env) {
	const enabled = environment.NEXT_PUBLIC_CHECKOUT_ENABLED;
	if (enabled !== undefined && enabled !== 'false' && enabled !== 'true') {
		throw new Error('NEXT_PUBLIC_CHECKOUT_ENABLED must be true or false');
	}
	if (enabled !== 'true') return Object.freeze({ enabled: false });

	const origin = AUTHORIZE_NET_BROWSER_ORIGINS[environment.NEXT_PUBLIC_AUTHORIZE_NET_ENVIRONMENT];
	if (!origin) {
		throw new Error('NEXT_PUBLIC_AUTHORIZE_NET_ENVIRONMENT must be sandbox or production');
	}
	return Object.freeze({
		enabled: true,
		environment: environment.NEXT_PUBLIC_AUTHORIZE_NET_ENVIRONMENT,
		origin,
		apiLoginId: publicValue(environment, 'NEXT_PUBLIC_AUTHORIZE_NET_API_LOGIN_ID'),
		clientKey: publicValue(environment, 'NEXT_PUBLIC_AUTHORIZE_NET_CLIENT_KEY'),
	});
}

export function buildSecurityHeaders(environment = process.env) {
	const isDevelopment = environment.NODE_ENV === 'development' || environment.NEXT_PUBLIC_MODE === 'dev';
	const apiUrl =
		environment.NEXT_PUBLIC_MODE === 'dev' ? environment.NEXT_PUBLIC_DEV_API_URL : environment.NEXT_PUBLIC_PROD_API_URL;
	const apiOrigin = httpOrigin(apiUrl);
	const payment = resolveAuthorizeNetBrowserConfig(environment);
	const connectSources = ["'self'", apiOrigin].filter(Boolean).join(' ');
	const imageSources = ["'self'", 'blob:', 'data:', apiOrigin, 'https://24-7labs.com'].filter(Boolean).join(' ');
	const scriptSources = ["'self'", "'unsafe-inline'", isDevelopment ? "'unsafe-eval'" : null, payment.origin]
		.filter(Boolean)
		.join(' ');
	const frameSources = ["'self'", 'https://maps.google.com', 'https://www.google.com', payment.origin]
		.filter(Boolean)
		.join(' ');
	const directives = [
		"default-src 'self'",
		`script-src ${scriptSources}`,
		"style-src 'self' 'unsafe-inline'",
		`img-src ${imageSources}`,
		"font-src 'self' data:",
		`connect-src ${connectSources}`,
		`frame-src ${frameSources}`,
		"object-src 'none'",
		"base-uri 'self'",
		"form-action 'self'",
		"frame-ancestors 'none'",
	];
	if (!isDevelopment) directives.push('upgrade-insecure-requests');

	const headers = [
		{ key: 'Content-Security-Policy', value: directives.join('; ') },
		{ key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
		{ key: 'X-Content-Type-Options', value: 'nosniff' },
		{ key: 'X-Frame-Options', value: 'DENY' },
		{ key: 'Permissions-Policy', value: 'camera=(), geolocation=(), microphone=(), payment=()' },
	];
	if (!isDevelopment) {
		headers.push({ key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' });
	}
	return headers;
}

export function buildApiImagePattern(environment = process.env) {
	const apiUrl =
		environment.NEXT_PUBLIC_MODE === 'dev' ? environment.NEXT_PUBLIC_DEV_API_URL : environment.NEXT_PUBLIC_PROD_API_URL;
	try {
		const parsed = new URL(apiUrl);
		if (!['http:', 'https:'].includes(parsed.protocol) || parsed.pathname !== '/' || parsed.search || parsed.hash)
			return null;
		return {
			protocol: parsed.protocol.slice(0, -1),
			hostname: parsed.hostname,
			port: parsed.port,
			pathname: '/uploads/**',
		};
	} catch {
		return null;
	}
}

export function validatePublicBuildConfig(environment = process.env) {
	if (!['dev', 'prod'].includes(environment.NEXT_PUBLIC_MODE)) {
		throw new Error('NEXT_PUBLIC_MODE must be dev or prod');
	}

	const apiVariable = environment.NEXT_PUBLIC_MODE === 'dev' ? 'NEXT_PUBLIC_DEV_API_URL' : 'NEXT_PUBLIC_PROD_API_URL';
	for (const name of [apiVariable, 'NEXT_PUBLIC_SITE_URL']) {
		const value = environment[name];
		if (!value) throw new Error(`${name} is required for a production image`);

		const parsed = new URL(value);
		const isLoopback = ['localhost', '127.0.0.1', '::1'].includes(parsed.hostname);
		if (parsed.username || parsed.password) throw new Error(`${name} must not contain credentials`);
		if (parsed.pathname !== '/' || parsed.search || parsed.hash) {
			throw new Error(`${name} must be an origin without a path, query, or fragment`);
		}
		if (parsed.protocol !== 'https:' && !(parsed.protocol === 'http:' && isLoopback)) {
			throw new Error(`${name} must use HTTPS (HTTP is allowed only for loopback development or smoke tests)`);
		}
	}
	resolveAuthorizeNetBrowserConfig(environment);
}
