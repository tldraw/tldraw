import type { TLRichText } from 'tldraw'
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
		[entry.authorName, formatTranscriptTime(entry.date, locale)].filter(Boolean).join(' • ')
	const text = entries
		.map((entry) => `${heading(entry)}\n${renderCommentPlaintext(entry.body, resolveName)}`)
		.join('\n\n')
	const html = entries
		.map((entry) => {
			const time = formatTranscriptTime(entry.date, locale)
			return (
				`<p><strong>${escapeHtml(entry.authorName)}</strong>` +
				(time ? ` • ${escapeHtml(time)}` : '') +
				`</p>${renderCommentHtml(entry.body, resolveName)}`
			)
		})
		.join('')
	return { text, html }
}

/**
 * A compact absolute time, e.g. "4 Nov 2026 21:31EST": day, short month and year, then 24-hour time
 * with the zone, so a pasted transcript says exactly when each comment was written.
 */
export function formatTranscriptTime(iso: string, locale: string): string {
	const date = new Date(iso)
	if (Number.isNaN(date.getTime())) return ''
	const parts = new Intl.DateTimeFormat(locale, {
		day: 'numeric',
		month: 'short',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
		hourCycle: 'h23',
		timeZoneName: 'short',
	}).formatToParts(date)
	const part = (type: Intl.DateTimeFormatPartTypes) =>
		parts.find((p) => p.type === type)?.value ?? ''
	return `${part('day')} ${part('month')} ${part('year')} ${part('hour')}:${part('minute')}${part('timeZoneName')}`
}

function escapeHtml(value: string): string {
	return value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
}
