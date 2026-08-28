/** @type {import('next').NextConfig} */

import createNextIntlPlugin from 'next-intl/plugin';
import {
	buildApiImagePattern,
	buildSecurityHeaders,
	usesUnoptimizedImages,
	validatePublicBuildConfig,
} from './config/securityHeaders.mjs';

validatePublicBuildConfig();
const apiImagePattern = buildApiImagePattern();

const nextConfig = {
	allowedDevOrigins: ['localhost', '*.localhost', '[::1]'],
	output: 'standalone',
	poweredByHeader: false,
	skipTrailingSlashRedirect: true,
	async headers() {
		return [
			{
				source: '/:path*',
				headers: buildSecurityHeaders(),
			},
		];
	},
	images: {
		// The optimizer cannot forward the browser's private-preview session. Let
		// the browser request same-origin media directly through the protected edge.
		unoptimized: usesUnoptimizedImages(),
		minimumCacheTTL: 86400,
		remotePatterns: [
			...(apiImagePattern ? [apiImagePattern] : []),
			{
				protocol: 'https',
				hostname: '24-7labs.com',
				pathname: '/wp-content/uploads/**',
			},
		],
	},
};

const withNextIntl = createNextIntlPlugin('./src/i18n/request.js');

export default withNextIntl(nextConfig);
