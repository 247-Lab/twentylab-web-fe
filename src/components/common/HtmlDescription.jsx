'use client';

import { useMemo } from 'react';
import { sanitizeCmsHtml } from '@/lib/htmlSanitizer';

export default function HtmlDescription({ content, className = '' }) {
	const sanitizedContent = useMemo(() => sanitizeCmsHtml(content), [content]);

	if (!sanitizedContent) return null;

	const baseStyles = `
        text-sm leading-relaxed text-slate-700 
        
        [&_h1]:mb-6 [&_h1]:mt-2 [&_h1]:text-3xl [&_h1]:font-bold [&_h1]:text-slate-900 [&_h1]:block
        [&_h2]:mb-4 [&_h2]:mt-6 [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-slate-800
        [&_h3]:mb-2 [&_h3]:mt-4 [&_h3]:text-xl [&_h3]:font-bold [&_h3]:text-slate-800
        
        [&_p]:mb-4 [&_p]:last:mb-0
        [&_strong]:font-bold [&_strong]:text-slate-900
        [&_em]:italic
        [&_br]:content-[''] [&_br]:block [&_br]:mb-2
        
        [&_a]:text-blue-600 [&_a]:underline hover:[&_a]:text-blue-800 [&_a]:transition-colors
        
        [&_ul]:mb-4 [&_ul]:ml-5 [&_ul]:list-disc [&_ul]:space-y-1
        [&_ol]:mb-4 [&_ol]:ml-5 [&_ol]:list-decimal [&_ol]:space-y-1
        [&_li]:pl-1
        
        [&_hr]:my-8 [&_hr]:border-t [&_hr]:border-slate-200
    `;

	return (
		<div
			className={`${baseStyles.replace(/\s+/g, ' ').trim()} ${className}`}
			dangerouslySetInnerHTML={{ __html: sanitizedContent }}
		/>
	);
}
