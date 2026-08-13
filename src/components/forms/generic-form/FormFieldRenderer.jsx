import SignatureField from '@/components/forms/SignatureField';
import { inputClassName, safeT } from './utils';
import { fieldMaxLength } from './validationConstraints';

export default function FormFieldRenderer({ field, value, fieldError, values, t, onChange }) {
	if (typeof field.showWhen === 'function' && !field.showWhen(values)) {
		return null;
	}

	const isFullWidth = field.span === 'full';
	const wrapperClass = isFullWidth ? 'md:col-span-2' : '';
	const maxLength = fieldMaxLength(field.name);

	if (field.type === 'notice') {
		return (
			<div
				key={field.name}
				className="rounded-xl border-2 border-rose-200 bg-rose-50 p-4 text-sm text-rose-900 md:col-span-2"
			>
				<p className="font-bold">{field.noticeTitle}</p>
				<ul className="mt-2 space-y-1">
					{field.noticeLines.map((line, index) => (
						<li key={`${field.name}-${index}`}>{line}</li>
					))}
				</ul>
			</div>
		);
	}

	if (field.type === 'agreement') {
		return (
			<div key={field.name} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 md:col-span-2">
				<details>
					<summary className="cursor-pointer text-sm font-bold text-slate-900">{field.label}</summary>
					<div className="mt-3 space-y-3 text-sm leading-relaxed text-slate-700">
						{field.content.map((paragraph, index) => (
							<p key={`${field.name}-content-${index}`}>{paragraph}</p>
						))}
					</div>
				</details>
				<label className="mt-3 flex items-start gap-2 text-sm font-semibold text-slate-800">
					<input
						type="checkbox"
						checked={Boolean(value)}
						onChange={(event) => onChange(field.name, event.target.checked)}
						className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[var(--tl-primary)]"
					/>
					<span>{safeT(t, 'common.agreeTo', 'I have read and agree.')}</span>
				</label>
				{fieldError ? <p className="mt-1 text-xs text-rose-600">{fieldError}</p> : null}
			</div>
		);
	}

	if (field.type === 'radio') {
		return (
			<div key={field.name} className="md:col-span-2">
				<p className="text-sm font-semibold text-slate-700">{field.label}</p>
				<div className="mt-2 flex flex-wrap gap-4">
					{field.options.map((option) => (
						<label
							key={`${field.name}-${option.value}`}
							className="inline-flex items-center gap-2 text-sm text-slate-700"
						>
							<input
								type="radio"
								name={field.name}
								value={option.value}
								checked={value === option.value}
								onChange={(event) => onChange(field.name, event.target.value)}
								className="h-4 w-4 border-slate-300 text-[var(--tl-primary)]"
							/>
							<span>{option.label}</span>
						</label>
					))}
				</div>
				{fieldError ? <p className="mt-1 text-xs text-rose-600">{fieldError}</p> : null}
			</div>
		);
	}

	if (field.type === 'select') {
		return (
			<label key={field.name} className={`${wrapperClass} text-sm font-semibold text-slate-700`}>
				{field.label}
				<select className={inputClassName} value={value} onChange={(event) => onChange(field.name, event.target.value)}>
					<option value="">{field.placeholder || safeT(t, 'common.selectOption', 'Select an option')}</option>
					{field.options.map((option) => (
						<option key={`${field.name}-${option.value}`} value={option.value}>
							{option.label}
						</option>
					))}
				</select>
				{fieldError ? <p className="mt-1 text-xs text-rose-600">{fieldError}</p> : null}
			</label>
		);
	}

	if (field.type === 'textarea') {
		return (
			<label key={field.name} className={`${wrapperClass} text-sm font-semibold text-slate-700`}>
				{field.label}
				<textarea
					rows={field.rows || 4}
					maxLength={maxLength}
					className={inputClassName}
					value={value}
					onChange={(event) => onChange(field.name, event.target.value)}
				/>
				{fieldError ? <p className="mt-1 text-xs text-rose-600">{fieldError}</p> : null}
			</label>
		);
	}

	if (field.type === 'signature') {
		return (
			<SignatureField
				key={field.name}
				label={field.label}
				value={value}
				error={fieldError}
				clearLabel={safeT(t, 'common.clearSignature', 'Clear Signature')}
				onChange={(nextValue) => onChange(field.name, nextValue)}
			/>
		);
	}

	return (
		<label key={field.name} className={`${wrapperClass} text-sm font-semibold text-slate-700`}>
			{field.label}
			<input
				type={field.type === 'date' ? 'date' : field.type === 'tel' ? 'tel' : field.type === 'email' ? 'email' : 'text'}
				className={inputClassName}
				maxLength={maxLength}
				value={value}
				onChange={(event) => onChange(field.name, event.target.value)}
			/>
			{fieldError ? <p className="mt-1 text-xs text-rose-600">{fieldError}</p> : null}
		</label>
	);
}
