import type { TLRichText } from 'tldraw'
import { formatCompactDateTime } from '../ui/format-time'
import { renderCommentHtml, renderCommentPlaintext } from './comment-render'

/** One comment as it appears in a copied transcript. */
export interface TranscriptEntry {
	authorName: string
	/** ISO datetime. */
	date: string
	body: TLRichText
}

/**
 * A thread's comments as clipboard text: each comment's author and absolute time over its body, as
 * plain text and as HTML. Absolute rather than relative time, since "7m ago" means nothing once
 * pasted somewhere else.
 */
export function formatThreadTranscript(
	entries: TranscriptEntry[],
	{ locale, resolveName }: { locale: string; resolveName?(id: string): string | undefined }
): { text: string; html: string } {
	const heading = (entry: TranscriptEntry) =>
		[entry.authorName, formatCompactDateTime(entry.date, locale)].filter(Boolean).join(' • ')
	const text = entries
		.map((entry) => `${heading(entry)}\n${renderCommentPlaintext(entry.body, resolveName)}`)
		.join('\n\n')
	const html = entries
		.map((entry) => {
			const time = formatCompactDateTime(entry.date, locale)
			return (
				`<p><strong>${escapeHtml(entry.authorName)}</strong>` +
				(time ? ` • ${escapeHtml(time)}` : '') +
				`</p>${renderCommentHtml(entry.body, resolveName)}`
			)
		})
		.join('')
	return { text, html }
}

function escapeHtml(value: string): string {
	return value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
}
