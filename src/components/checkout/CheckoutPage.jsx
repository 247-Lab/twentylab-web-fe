'use client';

import Script from 'next/script';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { CheckCircle2, LoaderCircle, LockKeyhole, Tag, TriangleAlert } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useCart } from '@/components/cart/CartProvider';
import { appData } from '@/lib/static-data';
import { createCheckoutCapability, processCheckoutPayment, validateCoupon } from '@/lib/api';
import {
	buildCheckoutPayload,
	formatCents,
	newPaymentAttemptIdempotencyKey,
	resolvePublicCheckoutConfig,
	validateAcceptUiResponse,
} from '@/lib/checkout';

const ACCEPT_UI_HANDLER_NAME = 'twentyFourSevenLabsAcceptUiResponseHandler';
const BILLING_ADDRESS_OPTIONS = JSON.stringify({ show: true, required: true });
const PAYMENT_OPTIONS = JSON.stringify({ showCreditCard: true, showBankAccount: false });

const initialForm = Object.freeze({
	firstname: '',
	lastname: '',
	emailaddress: '',
	phone: '',
	country: 'United States',
	house_number: '',
	apartment: '',
	city: '',
	countrystate: '',
	zipcode: '',
	appointment_time: '',
	additional_information: '',
});

function checkoutConfiguration() {
	try {
		return resolvePublicCheckoutConfig();
	} catch {
		return Object.freeze({ enabled: false, invalid: true });
	}
}

function DisabledCheckout({ count }) {
	const t = useTranslations('CheckoutPage');
	return (
		<main className="min-h-screen bg-[linear-gradient(180deg,#eef6ff_0%,#ffffff_40%,#f7fbff_100%)] px-4 py-12">
			<section className="mx-auto w-full max-w-2xl rounded-[2rem] border border-amber-200 bg-white p-8 text-center shadow-[0_30px_70px_-52px_rgba(2,6,14,0.7)]">
				<TriangleAlert className="mx-auto h-10 w-10 text-amber-600" aria-hidden="true" />
				<h1 className="font-display mt-4 text-3xl font-black text-[var(--tl-metallic-black)]">
					{t('unavailableTitle')}
				</h1>
				<p className="mt-3 text-slate-700">{t('unavailableMessage')}</p>
				<p className="mt-3 text-sm text-slate-600">{t('selectionStatus', { count })}</p>
				<div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
					<Link
						href="/contact"
						className="inline-flex items-center justify-center rounded-full bg-[var(--tl-primary)] px-6 py-3 text-sm font-bold text-white transition hover:bg-[var(--tl-primary-strong)]"
					>
						{t('contactLabs')}
					</Link>
					<Link
						href="/testing-services"
						className="inline-flex items-center justify-center rounded-full border border-sky-200 bg-white px-6 py-3 text-sm font-bold text-[var(--tl-primary-strong)] transition hover:bg-sky-50"
					>
						{t('returnToServices')}
					</Link>
				</div>
			</section>
		</main>
	);
}

export default function CheckoutPage() {
	const t = useTranslations('CheckoutPage');
	const locale = useLocale();
	const { cart, clearCart } = useCart();
	const publicCheckout = useMemo(checkoutConfiguration, []);
	const selectionCount = cart.items.reduce((count, item) => count + Number(item.quantity || 0), 0);
	const cartFingerprint = useMemo(
		() => JSON.stringify(cart.items.map(({ id, quantity }) => [String(id), Number(quantity)])),
		[cart.items]
	);
	const [form, setForm] = useState(initialForm);
	const [couponCode, setCouponCode] = useState('');
	const [appliedCoupon, setAppliedCoupon] = useState(null);
	const [couponError, setCouponError] = useState('');
	const [validatingCoupon, setValidatingCoupon] = useState(false);
	const [phase, setPhase] = useState('editing');
	const [capability, setCapability] = useState(null);
	const [scriptReady, setScriptReady] = useState(false);
	const [message, setMessage] = useState('');
	const [orderReference, setOrderReference] = useState(null);
	const capabilityRef = useRef(null);
	const processingRef = useRef(false);
	const paymentBlockedRef = useRef(true);
	const usedNonceValuesRef = useRef(new Set());

	useEffect(() => {
		capabilityRef.current = capability;
	}, [capability]);

	useEffect(() => {
		if (!capability || capability.cartFingerprint === cartFingerprint) return;
		capabilityRef.current = null;
		paymentBlockedRef.current = true;
		setCapability(null);
		setPhase('editing');
		setMessage(t('cartChanged'));
	}, [capability, cartFingerprint, t]);

	useEffect(() => {
		if (!capability) return undefined;
		const remaining = Date.parse(capability.expiresAt) - Date.now();
		if (!Number.isFinite(remaining) || remaining <= 0) {
			capabilityRef.current = null;
			paymentBlockedRef.current = true;
			setCapability(null);
			setPhase('editing');
			setMessage(t('sessionExpired'));
			return undefined;
		}
		const timer = window.setTimeout(() => {
			capabilityRef.current = null;
			paymentBlockedRef.current = true;
			setCapability(null);
			setPhase('editing');
			setMessage(t('sessionExpired'));
		}, remaining);
		return () => window.clearTimeout(timer);
	}, [capability, t]);

	useEffect(() => {
		if (!publicCheckout.enabled) return undefined;
		window[ACCEPT_UI_HANDLER_NAME] = async (response) => {
			const current = capabilityRef.current;
			if (!current || processingRef.current || paymentBlockedRef.current) return;
			const tokenized = validateAcceptUiResponse(response);
			if (tokenized.outcome !== 'tokenized') {
				setMessage(t('cardEntryError'));
				setPhase('ready');
				return;
			}
			if (usedNonceValuesRef.current.has(tokenized.opaqueData.dataValue)) return;
			usedNonceValuesRef.current.add(tokenized.opaqueData.dataValue);

			processingRef.current = true;
			paymentBlockedRef.current = true;
			setPhase('processing');
			setMessage('');
			try {
				const result = await processCheckoutPayment({
					checkoutToken: current.checkoutToken,
					idempotencyKey: current.idempotencyKey,
					opaqueData: tokenized.opaqueData,
				});
				if (result.outcome === 'succeeded') {
					setOrderReference(result.orderId);
					setPhase('succeeded');
					capabilityRef.current = null;
					paymentBlockedRef.current = true;
					setCapability(null);
					clearCart();
					return;
				}
				if (result.outcome === 'declined') {
					const next = { ...current, idempotencyKey: newPaymentAttemptIdempotencyKey() };
					capabilityRef.current = next;
					setCapability(next);
					paymentBlockedRef.current = false;
					setPhase('ready');
					setMessage(t('paymentDeclined'));
					return;
				}
				setPhase('confirmationRequired');
				setMessage(t('confirmationRequired'));
			} catch {
				// A provider call may have completed before a transport or server failure.
				// Keep the same attempt blocked for reconciliation instead of inviting a retry.
				setPhase('confirmationRequired');
				setMessage(t('confirmationRequired'));
			} finally {
				processingRef.current = false;
			}
		};

		return () => {
			delete window[ACCEPT_UI_HANDLER_NAME];
		};
	}, [clearCart, publicCheckout.enabled, t]);

	if (!publicCheckout.enabled) return <DisabledCheckout count={selectionCount} />;

	function onFieldChange(event) {
		const { name, value } = event.target;
		setForm((previous) => ({ ...previous, [name]: value }));
		setMessage('');
	}

	async function onApplyCoupon() {
		if (!couponCode.trim()) {
			setCouponError(t('couponRequired'));
			return;
		}
		setValidatingCoupon(true);
		setCouponError('');
		try {
			const value = await validateCoupon(couponCode);
			if (!Number.isSafeInteger(Number(value.id)) || Number(value.id) < 1) throw new Error();
			setAppliedCoupon({ ...value, id: Number(value.id) });
		} catch {
			setAppliedCoupon(null);
			setCouponError(t('couponInvalid'));
		} finally {
			setValidatingCoupon(false);
		}
	}

	function onRemoveCoupon() {
		setCouponCode('');
		setCouponError('');
		setAppliedCoupon(null);
	}

	async function onReviewOrder(event) {
		event.preventDefault();
		if (cart.items.length === 0) {
			setMessage(t('cartEmpty'));
			return;
		}
		setPhase('quoting');
		setMessage('');
		try {
			const payload = buildCheckoutPayload({ form, items: cart.items, couponId: appliedCoupon?.id ?? null });
			const quote = await createCheckoutCapability(payload);
			const next = {
				...quote,
				cartFingerprint,
				idempotencyKey: newPaymentAttemptIdempotencyKey(),
			};
			capabilityRef.current = next;
			paymentBlockedRef.current = false;
			setCapability(next);
			setPhase('ready');
		} catch (error) {
			setPhase('editing');
			setMessage(error?.message || t('submitError'));
		}
	}

	function editOrder() {
		capabilityRef.current = null;
		paymentBlockedRef.current = true;
		setCapability(null);
		setPhase('editing');
		setMessage('');
	}

	if (phase === 'succeeded') {
		return (
			<main className="min-h-screen bg-[linear-gradient(180deg,#eef6ff_0%,#ffffff_40%,#f7fbff_100%)] px-4 py-12">
				<section className="mx-auto w-full max-w-2xl rounded-[2rem] border border-emerald-200 bg-white p-8 text-center shadow-[0_30px_70px_-52px_rgba(5,20,10,0.45)]">
					<CheckCircle2 className="mx-auto h-10 w-10 text-emerald-700" aria-hidden="true" />
					<h1 className="font-display mt-4 text-3xl font-black text-[var(--tl-metallic-black)]">{t('successTitle')}</h1>
					<p className="mt-2 text-slate-600">{t('successBody')}</p>
					<p className="mt-2 text-sm font-bold text-slate-800">{t('orderReference', { reference: orderReference })}</p>
					<Link
						href="/"
						className="mt-6 inline-flex rounded-full bg-[var(--tl-primary)] px-6 py-3 text-sm font-bold text-white transition hover:bg-[var(--tl-primary-strong)]"
					>
						{t('goHome')}
					</Link>
				</section>
			</main>
		);
	}

	if (cart.items.length === 0) {
		return (
			<main className="min-h-screen bg-[linear-gradient(180deg,#eef6ff_0%,#ffffff_40%,#f7fbff_100%)] px-4 py-12">
				<section className="mx-auto w-full max-w-2xl rounded-[2rem] border border-sky-100 bg-white p-8 text-center">
					<h1 className="font-display text-3xl font-black text-[var(--tl-metallic-black)]">{t('emptyTitle')}</h1>
					<p className="mt-2 text-slate-600">{t('emptyBody')}</p>
					<Link
						href="/testing-services"
						className="mt-6 inline-flex rounded-full bg-[var(--tl-primary)] px-6 py-3 text-sm font-bold text-white"
					>
						{t('browseTests')}
					</Link>
				</section>
			</main>
		);
	}

	const detailsLocked = phase !== 'editing' && phase !== 'quoting';
	const paymentDisabled = phase !== 'ready' || !scriptReady;

	return (
		<main className="min-h-screen bg-[linear-gradient(180deg,#eef6ff_0%,#ffffff_40%,#f7fbff_100%)] px-4 py-8 lg:py-12">
			<section className="mx-auto w-full max-w-[1280px]">
				<header className="mb-6">
					<h1 className="font-display text-3xl font-black text-[var(--tl-metallic-black)] lg:text-4xl">{t('title')}</h1>
					<p className="mt-2 text-slate-600">{t('subtitle')}</p>
				</header>

				<div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
					<form
						onSubmit={onReviewOrder}
						className="rounded-[2rem] border border-sky-100 bg-white p-5 shadow-[0_22px_50px_-44px_rgba(2,6,14,0.8)] sm:p-6"
					>
						<h2 className="font-display text-xl font-black text-[var(--tl-metallic-black)]">{t('formTitle')}</h2>
						<div className="mt-4 grid gap-4 sm:grid-cols-2">
							{[
								['firstname', 'text'],
								['lastname', 'text'],
								['emailaddress', 'email'],
								['phone', 'tel'],
								['country', 'text'],
								['house_number', 'text'],
								['apartment', 'text'],
								['city', 'text'],
							].map(([name, type]) => (
								<div key={name}>
									<label
										htmlFor={`checkout-${name}`}
										className="text-xs font-bold tracking-[0.08em] text-slate-500 uppercase"
									>
										{t(`fields.${name}`)}
									</label>
									<input
										id={`checkout-${name}`}
										name={name}
										type={type}
										value={form[name]}
										onChange={onFieldChange}
										disabled={detailsLocked}
										required={name !== 'apartment'}
										autoComplete={name === 'emailaddress' ? 'email' : name === 'phone' ? 'tel' : undefined}
										className="field disabled:bg-slate-100"
									/>
								</div>
							))}
							<div>
								<label
									htmlFor="checkout-state"
									className="text-xs font-bold tracking-[0.08em] text-slate-500 uppercase"
								>
									{t('fields.countrystate')}
								</label>
								<select
									id="checkout-state"
									name="countrystate"
									value={form.countrystate}
									onChange={onFieldChange}
									disabled={detailsLocked}
									required
									className="field disabled:bg-slate-100"
								>
									<option value="">{t('selectState')}</option>
									{appData.states.map((state) => (
										<option key={state} value={state}>
											{state}
										</option>
									))}
								</select>
							</div>
							<div>
								<label
									htmlFor="checkout-zipcode"
									className="text-xs font-bold tracking-[0.08em] text-slate-500 uppercase"
								>
									{t('fields.zipcode')}
								</label>
								<input
									id="checkout-zipcode"
									name="zipcode"
									value={form.zipcode}
									onChange={onFieldChange}
									disabled={detailsLocked}
									required
									autoComplete="postal-code"
									className="field disabled:bg-slate-100"
								/>
							</div>
							<div className="sm:col-span-2">
								<label
									htmlFor="checkout-appointment"
									className="text-xs font-bold tracking-[0.08em] text-slate-500 uppercase"
								>
									{t('fields.appointment_time')}
								</label>
								<input
									id="checkout-appointment"
									name="appointment_time"
									type="datetime-local"
									value={form.appointment_time}
									onChange={onFieldChange}
									disabled={detailsLocked}
									required
									className="field disabled:bg-slate-100"
								/>
							</div>
							<div className="sm:col-span-2">
								<label
									htmlFor="checkout-notes"
									className="text-xs font-bold tracking-[0.08em] text-slate-500 uppercase"
								>
									{t('fields.additional_information')}
								</label>
								<textarea
									id="checkout-notes"
									name="additional_information"
									value={form.additional_information}
									onChange={onFieldChange}
									disabled={detailsLocked}
									maxLength={1000}
									rows={4}
									className="field resize-y disabled:bg-slate-100"
								/>
							</div>
						</div>

						{message ? (
							<div
								role="status"
								className={`mt-5 flex items-start gap-2 rounded-xl border px-3 py-2 text-sm ${phase === 'confirmationRequired' ? 'border-amber-300 bg-amber-50 text-amber-950' : 'border-rose-200 bg-rose-50 text-rose-700'}`}
							>
								<TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
								{message}
							</div>
						) : null}

						{phase === 'editing' || phase === 'quoting' ? (
							<button
								type="submit"
								disabled={phase === 'quoting'}
								className="mt-5 inline-flex items-center justify-center gap-2 rounded-full bg-[var(--tl-primary)] px-6 py-3 text-sm font-bold text-white transition hover:bg-[var(--tl-primary-strong)] disabled:cursor-not-allowed disabled:opacity-70"
							>
								{phase === 'quoting' ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
								{phase === 'quoting' ? t('confirmingPrice') : t('reviewAndConfirm')}
							</button>
						) : null}
					</form>

					<aside className="rounded-[2rem] border border-sky-100 bg-white p-5 shadow-[0_22px_50px_-44px_rgba(2,6,14,0.8)] sm:p-6">
						<h2 className="font-display text-xl font-black text-[var(--tl-metallic-black)]">{t('summaryTitle')}</h2>
						<ul className="mt-4 space-y-3">
							{cart.items.map((item) => (
								<li key={item.key} className="rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2">
									<p className="text-sm font-bold text-slate-800">{item.name}</p>
									<p className="text-xs text-slate-500">
										{t('qty')}: {item.quantity}
									</p>
								</li>
							))}
						</ul>

						<div className="mt-5 rounded-2xl border border-sky-100 bg-sky-50/55 p-4">
							<p className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-700">
								<Tag className="h-4 w-4" aria-hidden="true" />
								{t('couponTitle')}
							</p>
							{appliedCoupon ? (
								<div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm">
									<p className="font-bold text-emerald-800">
										{appliedCoupon.code} ({appliedCoupon.discount}%)
									</p>
									<button
										type="button"
										onClick={onRemoveCoupon}
										disabled={detailsLocked}
										className="mt-1 text-xs font-bold text-emerald-700 underline disabled:opacity-50"
									>
										{t('removeCoupon')}
									</button>
								</div>
							) : (
								<div className="flex gap-2">
									<input
										value={couponCode}
										onChange={(event) => {
											setCouponCode(event.target.value);
											setCouponError('');
										}}
										disabled={detailsLocked}
										placeholder={t('couponPlaceholder')}
										className="field min-w-0 disabled:bg-slate-100"
									/>
									<button
										type="button"
										onClick={onApplyCoupon}
										disabled={validatingCoupon || detailsLocked}
										className="rounded-full bg-[var(--tl-primary)] px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
									>
										{validatingCoupon ? t('validatingCoupon') : t('applyCoupon')}
									</button>
								</div>
							)}
							{couponError ? <p className="mt-2 text-xs font-semibold text-rose-700">{couponError}</p> : null}
						</div>

						<div className="mt-5 border-t border-slate-100 pt-4">
							<div className="flex items-center justify-between gap-4">
								<span className="font-bold text-slate-800">{t('total')}</span>
								<span className="font-display text-right text-xl font-black text-[var(--tl-metallic-black)]">
									{capability ? formatCents(capability.amountCents, locale) : t('confirmedBeforePayment')}
								</span>
							</div>
							<p className="mt-2 text-xs leading-relaxed text-slate-500">{t('serverPricingNotice')}</p>
						</div>

						<div className="mt-5 rounded-2xl border border-sky-200 bg-white p-4">
							<div className="flex items-start gap-2 text-sm text-slate-700">
								<LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-[var(--tl-primary)]" aria-hidden="true" />
								<p>{t('hostedPaymentNotice')}</p>
							</div>
							<button
								type="button"
								className="AcceptUI mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[var(--tl-primary)] px-6 py-3 text-sm font-bold text-white transition hover:bg-[var(--tl-primary-strong)] disabled:cursor-not-allowed disabled:opacity-50"
								disabled={paymentDisabled}
								data-billingaddressoptions={BILLING_ADDRESS_OPTIONS}
								data-paymentoptions={PAYMENT_OPTIONS}
								data-apiloginid={publicCheckout.apiLoginId}
								data-clientkey={publicCheckout.clientKey}
								data-acceptuiformbtntxt={t('authorizeSubmit')}
								data-acceptuiformheadertxt={t('authorizeHeader')}
								data-responsehandler={ACCEPT_UI_HANDLER_NAME}
							>
								{phase === 'processing' ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
								{phase === 'processing'
									? t('processingPayment')
									: capability
										? t('payAmount', { amount: formatCents(capability.amountCents, locale) })
										: t('reviewFirst')}
							</button>
							{capability && phase !== 'processing' && phase !== 'confirmationRequired' ? (
								<button
									type="button"
									onClick={editOrder}
									className="mt-3 w-full text-center text-sm font-bold text-[var(--tl-primary)] underline"
								>
									{t('editDetails')}
								</button>
							) : null}
						</div>
					</aside>
				</div>
			</section>
			<Script
				src={publicCheckout.scriptUrl}
				strategy="afterInteractive"
				onLoad={() => setScriptReady(true)}
				onError={() => {
					setScriptReady(false);
					setMessage(t('paymentLibraryUnavailable'));
				}}
			/>
		</main>
	);
}
