import { NextResponse } from 'next/server';

import { resolveCanonicalRedirect } from '@/lib/canonicalRedirects';

export function proxy(request) {
	const destination = resolveCanonicalRedirect(request.nextUrl.pathname);
	if (!destination) return NextResponse.next();

	const redirectUrl = new URL(request.url);
	redirectUrl.pathname = destination;
	return NextResponse.redirect(redirectUrl, 308);
}
