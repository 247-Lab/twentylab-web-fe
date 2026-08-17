export const TYPED_SIGNATURE_MAX_LENGTH = 150;

export function normalizeTypedSignatureName(value) {
	const name = String(value || '')
		.trim()
		.replace(/\s+/g, ' ');
	return name.length >= 2 && name.length <= TYPED_SIGNATURE_MAX_LENGTH ? name : null;
}

export function renderTypedSignaturePng(canvas, value) {
	const name = normalizeTypedSignatureName(value);
	if (!name) throw new Error('A typed signature must contain 2 through 150 characters');
	if (!canvas || typeof canvas.getContext !== 'function' || typeof canvas.toDataURL !== 'function') {
		throw new Error('A canvas is required to create a typed signature');
	}

	const context = canvas.getContext('2d');
	if (!context) throw new Error('The typed-signature canvas is unavailable');

	context.fillStyle = '#ffffff';
	context.fillRect(0, 0, canvas.width, canvas.height);
	context.fillStyle = '#475569';
	context.font = '600 16px sans-serif';
	context.fillText('SIGNATURE METHOD: TYPED', 32, 40);

	let fontSize = 48;
	context.font = `${fontSize}px "Segoe Script", "Brush Script MT", cursive`;
	while (fontSize > 24 && context.measureText(name).width > canvas.width - 64) {
		fontSize -= 2;
		context.font = `${fontSize}px "Segoe Script", "Brush Script MT", cursive`;
	}
	context.fillStyle = '#111827';
	context.fillText(name, 32, 120, canvas.width - 64);
	context.strokeStyle = '#94a3b8';
	context.beginPath();
	context.moveTo(32, 140);
	context.lineTo(canvas.width - 32, 140);
	context.stroke();
	context.fillStyle = '#475569';
	context.font = '14px sans-serif';
	context.fillText('Full legal name applied as an electronic signature', 32, 170);

	return canvas.toDataURL('image/png');
}
