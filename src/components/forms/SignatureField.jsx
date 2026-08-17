'use client';

import { useEffect, useId, useRef, useState } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import {
	TYPED_SIGNATURE_MAX_LENGTH,
	normalizeTypedSignatureName,
	renderTypedSignaturePng,
} from '@/components/forms/signaturePng';

export default function SignatureField({
	label,
	value,
	error,
	onChange,
	clearLabel = 'Clear Signature',
	drawModeLabel = 'Draw signature',
	typeModeLabel = 'Type signature',
	typedNameLabel = 'Full legal name',
	typedNameHelp = 'Typing your full legal name applies it as your electronic signature.',
	applyTypedLabel = 'Apply typed signature',
	typedAppliedLabel = 'Typed signature applied.',
	typedNameError = 'Enter your full legal name using 2 to 150 characters.',
}) {
	const sigPadRef = useRef(null);
	const wrapperRef = useRef(null);
	const typedCanvasRef = useRef(null);
	const signatureId = useId();
	const [canvasWidth, setCanvasWidth] = useState(750);
	const [mode, setMode] = useState('draw');
	const [typedName, setTypedName] = useState('');
	const [typedError, setTypedError] = useState('');
	const canvasHeight = 200;
	const typedHelpId = `${signatureId}-typed-help`;
	const typedErrorId = `${signatureId}-typed-error`;

	useEffect(() => {
		if (!wrapperRef.current) {
			return;
		}

		const wrapperEl = wrapperRef.current;

		const updateWidth = () => {
			if (!wrapperEl) {
				return;
			}
			const nextWidth = Math.max(280, Math.floor(wrapperEl.clientWidth || 0));
			setCanvasWidth(nextWidth);
		};

		updateWidth();

		const observer = new ResizeObserver(updateWidth);
		observer.observe(wrapperEl);

		return () => observer.disconnect();
	}, []);

	// Keep old behavior: clear drawn signature when parent resets this field.
	useEffect(() => {
		if (!value && sigPadRef.current && !sigPadRef.current.isEmpty()) {
			sigPadRef.current.clear();
		}
	}, [value]);

	const handleEnd = () => {
		if (!sigPadRef.current || sigPadRef.current.isEmpty()) {
			return;
		}
		onChange(sigPadRef.current.toDataURL('image/png'));
	};

	const clearSignature = () => {
		if (sigPadRef.current) sigPadRef.current.clear();
		onChange('');
		setTypedName('');
		setTypedError('');
	};

	const applyTypedSignature = () => {
		const normalizedName = normalizeTypedSignatureName(typedName);
		if (!normalizedName) {
			setTypedError(typedNameError);
			return;
		}
		try {
			const dataUrl = renderTypedSignaturePng(typedCanvasRef.current, normalizedName);
			setTypedName(normalizedName);
			setTypedError('');
			onChange(dataUrl);
		} catch {
			setTypedError(typedNameError);
		}
	};

	const switchMode = (nextMode) => {
		if (nextMode === mode) return;
		clearSignature();
		setMode(nextMode);
	};

	return (
		<div className="w-full md:col-span-2">
			<fieldset>
				<legend className="text-sm font-semibold text-slate-700">{label}</legend>
				<div className="mt-2 flex flex-wrap gap-4">
					<label className="inline-flex items-center gap-2 text-sm text-slate-700">
						<input
							type="radio"
							name={`${signatureId}-mode`}
							checked={mode === 'draw'}
							onChange={() => switchMode('draw')}
						/>
						{drawModeLabel}
					</label>
					<label className="inline-flex items-center gap-2 text-sm text-slate-700">
						<input
							type="radio"
							name={`${signatureId}-mode`}
							checked={mode === 'type'}
							onChange={() => switchMode('type')}
						/>
						{typeModeLabel}
					</label>
				</div>
			</fieldset>
			{mode === 'draw' ? (
				<div
					ref={wrapperRef}
					className={`mt-2 w-full overflow-hidden rounded-xl border-2 bg-white ${
						error ? 'border-rose-500' : 'border-slate-300'
					}`}
				>
					<SignatureCanvas
						ref={sigPadRef}
						penColor="black"
						onEnd={handleEnd}
						canvasProps={{
							width: canvasWidth,
							height: canvasHeight,
							className: 'block touch-none w-full',
							'aria-label': drawModeLabel,
						}}
					/>
				</div>
			) : (
				<div className="mt-3">
					<label htmlFor={`${signatureId}-typed-name`} className="block text-sm font-semibold text-slate-700">
						{typedNameLabel}
						<input
							id={`${signatureId}-typed-name`}
							type="text"
							value={typedName}
							maxLength={TYPED_SIGNATURE_MAX_LENGTH}
							autoComplete="name"
							aria-describedby={typedError ? `${typedHelpId} ${typedErrorId}` : typedHelpId}
							aria-invalid={Boolean(typedError)}
							required
							className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5"
							onChange={(event) => {
								setTypedName(event.target.value);
								setTypedError('');
								onChange('');
							}}
						/>
					</label>
					<p id={typedHelpId} className="mt-1 text-xs text-slate-600">
						{typedNameHelp}
					</p>
					<button
						type="button"
						onClick={applyTypedSignature}
						className="mt-2 rounded-full bg-[var(--tl-primary)] px-4 py-2 text-sm font-bold text-white"
					>
						{applyTypedLabel}
					</button>
					{value ? (
						<p role="status" className="mt-2 text-sm font-semibold text-emerald-700">
							{typedAppliedLabel}
						</p>
					) : null}
					<canvas ref={typedCanvasRef} width="750" height="200" hidden aria-hidden="true" />
					{typedError ? (
						<p id={typedErrorId} role="alert" className="mt-1 text-xs text-rose-600">
							{typedError}
						</p>
					) : null}
				</div>
			)}
			<div className="mt-2 text-right">
				<button
					type="button"
					onClick={clearSignature}
					className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
				>
					{clearLabel}
				</button>
			</div>
			{error ? <p className="mt-1 text-xs text-rose-600">{error}</p> : null}
		</div>
	);
}
