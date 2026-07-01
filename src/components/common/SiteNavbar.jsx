'use client';

import Image from 'next/image';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Fragment, useEffect, useRef, useState } from 'react';
import { ChevronDown, Menu, Search, ShoppingCart, X } from 'lucide-react';
import { useCart } from '@/components/cart/CartProvider';

const CartDrawer = dynamic(() => import('@/components/cart/CartDrawer'));

const primaryMenuItems = [
	{ key: 'about', href: '/about' },
	{ key: 'blogs', href: '/blogs' },
	{ key: 'covid', href: '/covid-19' },
	{ key: 'trust', href: '/trust-standards' },
	{ key: 'testingServices', href: '/testing-services' },
	{
		key: 'homeKits',
		href: 'https://247labkit.com/',
		external: true,
	},
];

const testingMenuItems = [
	{ key: 'testingServices', href: '/testing-services' },
	{ key: 'dnaTestingServices', href: '/dna-testing' },
	{ key: 'stdTestingServices', href: '/std-testing' },
	{ key: 'drugTesting', href: '/drug-testing' },
	{ key: 'allergyTesting', href: '/allergy-testing' },
	{ key: 'heartTesting', href: '/heart-testing' },
	{ key: 'hormoneTesting', href: '/hormone-testing' },
	{ key: 'routineHealthTesting', href: '/routine-health-testing' },
];

const businessMenuItems = [
	{ key: 'businessOpportunities', href: '/business-opportunities' },
	{ key: 'businessSolutions', href: '/business-solutions' },
	{ key: 'privacyPolicy', href: '/privacy-policy' },
	{ key: 'telemedicine', href: '/telemedicine' },
];

const formsMenuItems = [
	{ key: 'contactForm', href: '/contact' },
	{ key: 'appointmentForm', href: '/schedule-appointment' },
	{ key: 'patientIntakeForm', href: '/patient-intake-form' },
	{ key: 'covidScreeningForm', href: '/covid-screening-form' },
	{ key: 'prescriptionConsentForm', href: '/prescription-consent-form' },
];

const loginMenuItems = [
	{
		key: 'patientLogin',
		href: 'https://24-7labs.apexcloudlab.org/frmPPLogin.aspx',
		external: true,
	},
	{
		key: 'providerLogin',
		href: 'https://24-7labs.apexcloudlab.org/ProviderLogin.aspx',
		external: true,
	},
];

const tapeItems = [
	{ key: 'open24x7', href: '/trust-standards' },
	{ key: 'noInsuranceNoPrescription', href: '/#services' },
	{ key: 'clia', href: '/trust-standards#clia' },
	{ key: 'cap', href: '/trust-standards#cap' },
	{ key: 'hipaa', href: '/trust-standards#hipaa' },
	{ key: 'results', href: '/trust-standards' },
];

const isActiveRoute = (pathname, href) =>
	pathname === href &&
	[...primaryMenuItems, ...businessMenuItems, ...formsMenuItems].some((item) => item.href === href);

const isFormsRoute = (pathname) => formsMenuItems.some((item) => isActiveRoute(pathname, item.href));

const isBusinessRoute = (pathname) => businessMenuItems.some((item) => isActiveRoute(pathname, item.href));

const NavDropdown = ({ label, items, pathname, checkActive, checkParentActive, t }) => {
	const isParentActive = checkParentActive(pathname);

	return (
		<li className="group relative">
			<button
				type="button"
				className={`group inline-flex h-10 items-center rounded-full px-3 py-2 whitespace-nowrap transition hover:bg-white/75 hover:text-[var(--tl-primary-strong)] ${
					isParentActive ? 'bg-white/85 text-[var(--tl-primary-strong)]' : ''
				}`}
			>
				<span>{label}</span>
				<ChevronDown className="ml-1.5 h-3.5 w-3.5" />
				<span
					className={`absolute bottom-[4px] left-3 h-[2px] rounded-full bg-[var(--tl-primary)] transition-all duration-300 group-hover:w-8 ${
						isParentActive ? 'w-8' : 'w-0'
					}`}
				/>
			</button>

			<div className="invisible absolute left-1/2 z-50 mt-2 w-72 -translate-x-1/2 rounded-2xl border border-slate-200 bg-white p-2 opacity-0 shadow-xl transition-all duration-200 group-hover:visible group-hover:opacity-100">
				<ul className="space-y-0.5">
					{items.map((item) => {
						const isActive = checkActive(pathname, item.href);

						return (
							<li key={`desktop-${item.key}`}>
								{item.external ? (
									<a
										href={item.href}
										target="_blank"
										rel="noreferrer"
										className="block rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-sky-50 hover:text-[var(--tl-primary-strong)]"
									>
										{t(`menu.${item.key}`)}
									</a>
								) : (
									<Link
										href={item.href}
										className={`block rounded-xl px-3 py-2 text-sm font-semibold transition hover:bg-sky-50 hover:text-[var(--tl-primary-strong)] ${
											isActive ? 'bg-sky-50 text-[var(--tl-primary-strong)]' : 'text-slate-700'
										}`}
									>
										{t(`menu.${item.key}`)}
									</Link>
								)}
							</li>
						);
					})}
				</ul>
			</div>
		</li>
	);
};

export default function SiteNavbar() {
	const t = useTranslations('SiteNavbar');
	const { cart } = useCart();
	const tapeItemsExtended = [...tapeItems, ...tapeItems];
	const pathname = usePathname();
	const router = useRouter();
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
	const [mobileBusinessOpen, setMobileBusinessOpen] = useState(false);
	const [mobileFormsOpen, setMobileFormsOpen] = useState(false);
	const [mobileLoginOpen, setMobileLoginOpen] = useState(false);
	const [cartOpen, setCartOpen] = useState(false);
	const [searchOpen, setSearchOpen] = useState(false);
	const [navSearch, setNavSearch] = useState('');
	const [isScrolled, setIsScrolled] = useState(false);
	const scrollProgressRef = useRef(null);

	useEffect(() => {
		let animationFrameId = null;
		const updateScrollState = () => {
			const offsetY = window.scrollY;
			setIsScrolled(offsetY > 0);

			const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
			const progress = maxScroll > 0 ? (offsetY / maxScroll) * 100 : 0;
			if (scrollProgressRef.current) {
				scrollProgressRef.current.style.width = `${Math.min(100, Math.max(0, progress))}%`;
			}
		};
		const onScroll = () => {
			if (animationFrameId !== null) {
				return;
			}

			animationFrameId = window.requestAnimationFrame(() => {
				animationFrameId = null;
				updateScrollState();
			});
		};

		updateScrollState();
		window.addEventListener('scroll', onScroll, { passive: true });

		return () => {
			window.removeEventListener('scroll', onScroll);
			if (animationFrameId !== null) {
				window.cancelAnimationFrame(animationFrameId);
			}
		};
	}, []);

	const handleSearchSubmit = (event) => {
		event.preventDefault();

		const query = navSearch.trim();
		const nextUrl = query ? `/testing-services?search=${encodeURIComponent(query)}` : '/testing-services';

		router.push(nextUrl);
		setSearchOpen(false);
		setMobileMenuOpen(false);
	};

	return (
		<header
			className={`fixed top-0 z-50 w-full transition-all duration-500 ${
				isScrolled
					? 'border-b border-white/20 bg-[rgba(217,232,255,0.4)] shadow-sm backdrop-blur-md'
					: 'border-b border-transparent bg-[rgb(217,232,255)]'
			}`}
		>
			<div
				className={`overflow-hidden bg-gradient-to-r from-[var(--tl-primary)] to-[var(--tl-primary-strong)] transition-[max-height,border-color] duration-100 ease-out ${
					isScrolled ? 'max-h-0 border-b border-transparent' : 'max-h-6 border-b border-white/45'
				}`}
			>
				<div className="marquee-right marquee-pausable h-6">
					<div className="marquee-track-right-tape">
						{[0, 1].map((groupIndex) => (
							<div key={`marquee-group-${groupIndex}`} className="marquee-group flex items-center gap-6 sm:gap-10">
								{tapeItemsExtended.map((item, itemIndex) => (
									<Fragment key={`marquee-item-${groupIndex}-${itemIndex}`}>
										<Link
											href={item.href}
											className="text-[8px] leading-none font-bold tracking-[0.08em] whitespace-nowrap text-white uppercase transition hover:text-sky-200 sm:text-[9px] sm:tracking-[0.1em]"
										>
											{t(`tape.${item.key}`)}
										</Link>
										<span className="text-xs text-white/60" aria-hidden="true">
											•
										</span>
									</Fragment>
								))}
							</div>
						))}
					</div>
				</div>
			</div>

			<div className="mx-auto w-full max-w-[1360px] px-4 lg:px-6">
				<div className="flex h-[74px] items-center justify-between gap-3">
					<Link href="/" className="shrink-0" aria-label={t('aria.home')}>
						<Image
							src="/images/logo-dark.png"
							alt={t('brand.logoAlt')}
							width={214}
							height={52}
							className="h-20 w-auto sm:h-20"
							priority
						/>
					</Link>

					<nav className="hidden min-w-0 flex-1 xl:block">
						<ul className="flex items-center justify-center gap-0.5 text-[11.5px] font-semibold text-slate-700">
							{primaryMenuItems.map((item) => {
								const isActive = !item.external && isActiveRoute(pathname, item.href);

								return (
									<li key={item.key}>
										{item.external ? (
											<a
												href={item.href}
												target="_blank"
												rel="noreferrer"
												className="group relative inline-flex h-10 items-center rounded-full px-3 py-2 whitespace-nowrap transition hover:bg-white/75 hover:text-[var(--tl-primary-strong)]"
											>
												<span>{t(`menu.${item.key}`)}</span>
												<span className="absolute bottom-[4px] left-3 h-[2px] w-0 rounded-full bg-[var(--tl-primary)] transition-all duration-300 group-hover:w-8" />
											</a>
										) : (
											<Link
												href={item.href}
												className={`group relative inline-flex h-10 items-center rounded-full px-3 py-2 whitespace-nowrap transition hover:bg-white/75 hover:text-[var(--tl-primary-strong)] ${
													isActive ? 'bg-white/85 text-[var(--tl-primary-strong)]' : ''
												}`}
											>
												<span>{t(`menu.${item.key}`)}</span>
												<span
													className={`absolute bottom-[4px] left-3 h-[2px] rounded-full bg-[var(--tl-primary)] transition-all duration-300 group-hover:w-8 ${
														isActive ? 'w-8' : 'w-0'
													}`}
												/>
											</Link>
										)}
									</li>
								);
							})}

							<NavDropdown
								label={t('menu.forms')}
								items={formsMenuItems}
								pathname={pathname}
								checkActive={isActiveRoute}
								checkParentActive={isFormsRoute}
								t={t}
							/>

							<NavDropdown
								label={t('menu.business')}
								items={businessMenuItems}
								pathname={pathname}
								checkActive={isActiveRoute}
								checkParentActive={isBusinessRoute}
								t={t}
							/>

							<NavDropdown
								label={t('menu.login')}
								items={loginMenuItems}
								pathname={pathname}
								checkActive={isActiveRoute}
								checkParentActive={() => false}
								t={t}
							/>
						</ul>
					</nav>

					<div className="flex items-center gap-1.5 sm:gap-3">
						<button
							type="button"
							className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white/90 text-slate-700 shadow-sm shadow-white/70 transition hover:scale-105 hover:border-[var(--tl-primary)] hover:text-[var(--tl-primary)]"
							aria-label={t('aria.openCart')}
							onClick={() => setCartOpen(true)}
						>
							<ShoppingCart className="h-4.5 w-4.5" />
							{cart.itemCount > 0 ? (
								<span className="absolute -top-1 -right-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-[var(--tl-primary)] px-1 text-[10px] font-bold text-white">
									{cart.itemCount > 99 ? '99+' : cart.itemCount}
								</span>
							) : null}
						</button>

						<button
							type="button"
							className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white/90 text-slate-700 shadow-sm shadow-white/70 transition hover:scale-105 hover:border-[var(--tl-primary)] hover:text-[var(--tl-primary)]"
							aria-label={t('aria.search')}
							aria-expanded={searchOpen}
							onClick={() => setSearchOpen((prev) => !prev)}
						>
							{searchOpen ? <X className="h-4.5 w-4.5" /> : <Search className="h-4.5 w-4.5" />}
						</button>

						<a
							href="tel:8139323741"
							className="nav-pill-glow hidden rounded-full bg-gradient-to-r from-[var(--tl-primary)] via-[var(--tl-primary-strong)] to-[var(--tl-metallic-black)] px-4 py-2 text-sm font-extrabold text-white shadow-[0_14px_28px_-18px_rgba(5,7,13,0.85)] 2xl:inline-flex"
						>
							{t('contact.phoneDisplay')}
						</a>

						<button
							type="button"
							className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white/90 text-slate-700 shadow-sm transition hover:border-[var(--tl-primary)] hover:text-[var(--tl-primary)] xl:hidden"
							aria-label={mobileMenuOpen ? t('aria.closeMenu') : t('aria.openMenu')}
							onClick={() => setMobileMenuOpen((prev) => !prev)}
						>
							{mobileMenuOpen ? <X className="h-4.5 w-4.5" /> : <Menu className="h-4.5 w-4.5" />}
						</button>
					</div>
				</div>

				<div
					className={`overflow-hidden transition-all duration-300 ${
						searchOpen ? 'max-h-24 pb-3 opacity-100' : 'max-h-0 opacity-0'
					}`}
				>
					<form
						onSubmit={handleSearchSubmit}
						role="search"
						className="ml-auto flex w-full max-w-xl items-center gap-2 rounded-2xl border border-white/80 bg-white/95 p-2 shadow-[0_18px_45px_-34px_rgba(2,6,14,0.85)]"
					>
						<div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 focus-within:bg-white">
							<Search className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
							<input
								value={navSearch}
								onChange={(event) => setNavSearch(event.target.value)}
								placeholder={t('search.placeholder')}
								className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-slate-900 outline-none placeholder:text-slate-400"
							/>
						</div>
						<button
							type="submit"
							className="inline-flex h-10 shrink-0 items-center justify-center rounded-xl bg-[var(--tl-primary)] px-4 text-sm font-bold text-white transition hover:bg-[var(--tl-primary-strong)]"
						>
							{t('search.submit')}
						</button>
					</form>
				</div>

				<div
					className={`overflow-hidden transition-all duration-500 xl:hidden ${
						mobileMenuOpen ? 'max-h-[520px] pb-4 opacity-100' : 'max-h-0 opacity-0'
					}`}
				>
					<ul className="grid max-h-[70vh] gap-1 overflow-y-auto rounded-2xl border border-white/75 bg-white/85 p-3">
						{primaryMenuItems.map((item) => (
							<li key={`mobile-${item.key}`} className="menu-item">
								{item.external ? (
									<a
										href={item.href}
										target="_blank"
										rel="noreferrer"
										onClick={() => setMobileMenuOpen(false)}
										className="block rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-sky-50 hover:text-[var(--tl-primary-strong)]"
									>
										{t(`menu.${item.key}`)}
									</a>
								) : (
									<Link
										href={item.href}
										onClick={() => setMobileMenuOpen(false)}
										className="block rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-sky-50 hover:text-[var(--tl-primary-strong)]"
									>
										{t(`menu.${item.key}`)}
									</Link>
								)}
							</li>
						))}

						<li className="overflow-hidden rounded-xl border border-slate-200 bg-white/90">
							<button
								type="button"
								onClick={() => setMobileFormsOpen((prev) => !prev)}
								className="flex w-full items-center justify-between px-3 py-2.5 text-left text-sm font-semibold text-slate-700"
							>
								<span>{t('menu.forms')}</span>
								<ChevronDown className={`h-4 w-4 transition-transform ${mobileFormsOpen ? 'rotate-180' : ''}`} />
							</button>
							{mobileFormsOpen ? (
								<ul className="space-y-1 border-t border-slate-200 px-2 py-2">
									{formsMenuItems.map((item) => (
										<li key={`mobile-forms-${item.key}`}>
											<Link
												href={item.href}
												onClick={() => setMobileMenuOpen(false)}
												className={`block rounded-lg px-3 py-2 text-sm font-semibold transition ${
													isActiveRoute(pathname, item.href)
														? 'bg-sky-50 text-[var(--tl-primary-strong)]'
														: 'text-slate-700 hover:bg-sky-50 hover:text-[var(--tl-primary-strong)]'
												}`}
											>
												{t(`menu.${item.key}`)}
											</Link>
										</li>
									))}
								</ul>
							) : null}
						</li>

						<li className="overflow-hidden rounded-xl border border-slate-200 bg-white/90">
							<button
								type="button"
								onClick={() => setMobileLoginOpen((prev) => !prev)}
								className="flex w-full items-center justify-between px-3 py-2.5 text-left text-sm font-semibold text-slate-700"
							>
								<span>{t('menu.login')}</span>
								<ChevronDown className={`h-4 w-4 transition-transform ${mobileLoginOpen ? 'rotate-180' : ''}`} />
							</button>
							{mobileLoginOpen ? (
								<ul className="space-y-1 border-t border-slate-200 px-2 py-2">
									{loginMenuItems.map((item) => (
										<li key={`mobile-login-${item.key}`}>
											<a
												href={item.href}
												target="_blank"
												rel="noreferrer"
												onClick={() => setMobileMenuOpen(false)}
												className="block rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-sky-50 hover:text-[var(--tl-primary-strong)]"
											>
												{t(`menu.${item.key}`)}
											</a>
										</li>
									))}
								</ul>
							) : null}
						</li>

						<li className="overflow-hidden rounded-xl border border-slate-200 bg-white/90">
							<button
								type="button"
								onClick={() => setMobileBusinessOpen((prev) => !prev)}
								className="flex w-full items-center justify-between px-3 py-2.5 text-left text-sm font-semibold text-slate-700"
							>
								<span>{t('menu.business')}</span>
								<ChevronDown className={`h-4 w-4 transition-transform ${mobileBusinessOpen ? 'rotate-180' : ''}`} />
							</button>
							{mobileBusinessOpen ? (
								<ul className="space-y-1 border-t border-slate-200 px-2 py-2">
									{businessMenuItems.map((item) => (
										<li key={`mobile-business-${item.key}`}>
											<Link
												href={item.href}
												onClick={() => setMobileMenuOpen(false)}
												className={`block rounded-lg px-3 py-2 text-sm font-semibold transition ${
													isActiveRoute(pathname, item.href)
														? 'bg-sky-50 text-[var(--tl-primary-strong)]'
														: 'text-slate-700 hover:bg-sky-50 hover:text-[var(--tl-primary-strong)]'
												}`}
											>
												{t(`menu.${item.key}`)}
											</Link>
										</li>
									))}
								</ul>
							) : null}
						</li>
					</ul>
				</div>
			</div>

			<div className="absolute inset-x-0 bottom-0 h-[2px] overflow-hidden bg-white/50">
				<div
					ref={scrollProgressRef}
					className="h-full bg-gradient-to-r from-[var(--tl-primary-soft)] via-[var(--tl-primary)] to-[var(--tl-primary-strong)] transition-[width] duration-300"
					style={{ width: '0%' }}
				/>
			</div>

			{cartOpen ? <CartDrawer open onClose={() => setCartOpen(false)} /> : null}
		</header>
	);
}
