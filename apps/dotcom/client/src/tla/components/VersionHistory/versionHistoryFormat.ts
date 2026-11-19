import { HistoryAuthor, HistoryUser } from '@tldraw/dotcom-shared'

export type ChangeKind = 'added' | 'edited' | 'deleted'

/** "4 shapes added · 2 edited · 1 deleted", skipping zeros. `phrase` supplies the translations. */
export function formatChangeSummary(
	c: { added: number; updated: number; removed: number },
	phrase: (kind: ChangeKind, count: number) => string
) {
	const parts: string[] = []
	if (c.added) parts.push(phrase('added', c.added))
	if (c.updated) parts.push(phrase('edited', c.updated))
	if (c.removed) parts.push(phrase('deleted', c.removed))
	return parts.join(' · ')
}

export function authorInitial(author: HistoryAuthor, users: Record<string, HistoryUser>) {
	if (author.agent) return '✦'
	const name = author.userId ? users[author.userId]?.name : undefined
	return name ? name.trim().charAt(0).toUpperCase() || '?' : '?'
}

export function formatVersionTime(ts: string, now = new Date()) {
	const date = new Date(ts)
	const time = date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
	if (date.toDateString() === now.toDateString()) return { today: true, time }
	return {
		today: false,
		time: date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }),
	}
}
