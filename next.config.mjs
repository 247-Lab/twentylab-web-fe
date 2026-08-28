/** @type {import('next').NextConfig} */

import createNextIntlPlugin from 'next-intl/plugin';
import { buildApiImagePattern, buildSecurityHeaders, validatePublicBuildConfig } from './config/securityHeaders.mjs';

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
		// Synthetic images use browser-loopback media URLs that are not reachable
		// from the optimizer process inside the storefront container.
		unoptimized: process.env.NEXT_PUBLIC_MODE === 'dev',
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
