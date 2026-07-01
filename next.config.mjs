/** @type {import('next').NextConfig} */

import createNextIntlPlugin from 'next-intl/plugin';

const nextConfig = {
	allowedDevOrigins: ['**.*', 'localhost', '*.localhost', '[::1]'],
	images: {
		minimumCacheTTL: 86400,
		remotePatterns: [
			{
				protocol: 'https',
				hostname: '247labstage.spctek.com',
				pathname: '/**',
			},
			{
				protocol: 'https',
				hostname: '247labstage.spctek.com',
				port: '9000',
				pathname: '/uploads/**',
			},
			{
				protocol: 'http',
				hostname: 'localhost',
				port: '3000',
				pathname: '/uploads/**',
			},
			{
				protocol: 'http',
				hostname: '127.0.0.1',
				port: '3000',
				pathname: '/uploads/**',
			},
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
