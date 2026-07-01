const UNOPTIMIZED_IMAGE_HOSTS = new Set(['247labstage.spctek.com']);

export function shouldBypassImageOptimization(src) {
	if (typeof src !== 'string' || !src.startsWith('http')) {
		return false;
	}

	try {
		return UNOPTIMIZED_IMAGE_HOSTS.has(new URL(src).hostname);
	} catch {
		return false;
	}
}
