import { Manrope, Montserrat } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import RouteScrollReset from '@/components/common/RouteScrollReset';
import SiteNavbar from '@/components/common/SiteNavbar';
import SiteFooter from '@/components/common/SiteFooter';
import FloatingLocaleSwitcher from '@/components/common/FloatingLocaleSwitcher';
import { CartProvider } from '@/components/cart/CartProvider';
import CartPersistenceAlert from '@/components/cart/CartPersistenceAlert';
import { SITE_URL } from '@/lib/seo';
import './globals.css';

const montserrat = Montserrat({
	variable: '--font-montserrat',
	subsets: ['latin'],
	weight: ['500', '600', '700', '800', '900'],
});

const manrope = Manrope({
	variable: '--font-manrope',
	subsets: ['latin'],
});

export const metadata = {
	metadataBase: new URL(SITE_URL),
	title: '24-7 Labs | Tampa Testing Services',
	description:
		'Convenient diagnostic testing, appointment scheduling, and laboratory services in Tampa from 24-7 Labs.',
	alternates: {
		canonical: '/',
	},
};

export default async function RootLayout({ children }) {
	const [locale, messages] = await Promise.all([getLocale(), getMessages()]);

	return (
		<html
			lang={locale}
			data-scroll-behavior="smooth"
			className={`${montserrat.variable} ${manrope.variable} h-full scroll-smooth antialiased`}
		>
			<body className="min-h-full bg-[var(--tl-surface)] font-sans text-[var(--tl-ink)]">
				<NextIntlClientProvider locale={locale} messages={messages}>
					<CartProvider>
						<CartPersistenceAlert />
						<RouteScrollReset />
						<SiteNavbar />
						<div className="pt-[98px]">{children}</div>
						<SiteFooter locale={locale} />
						<FloatingLocaleSwitcher />
					</CartProvider>
				</NextIntlClientProvider>
			</body>
		</html>
	);
}
