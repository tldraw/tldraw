import { HistoryAuthor, HistorySession } from '@tldraw/dotcom-shared'

export type HistoryRow =
	| { level: 'session'; session: HistorySession }
	| {
			level: 'day' | 'week'
			key: string
			end: string
			sessions: HistorySession[]
			authors: HistoryAuthor[]
			added: number
			updated: number
			removed: number
	  }

const DAY_MS = 86400_000

function localDate(ts: string, timeZone: string) {
	// en-CA formats as YYYY-MM-DD
	return new Intl.DateTimeFormat('en-CA', {
		timeZone,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
	}).format(new Date(ts))
}

function weekStart(localDay: string) {
	const d = new Date(`${localDay}T00:00:00.000Z`)
	d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7))
	return d.toISOString().slice(0, 10)
}

function mergeAuthors(sessions: HistorySession[]) {
	const seen = new Map<string, HistoryAuthor>()
	for (const s of sessions) {
		for (const a of s.authors) seen.set(`${a.userId ?? ''}|${a.agent ?? ''}`, a)
	}
	return [...seen.values()]
}

/** Recent sessions stay individual; 8-30 days group by local day, older by local week. */
export function groupByAge(sessions: HistorySession[], now: Date, timeZone: string): HistoryRow[] {
	const rows: HistoryRow[] = []
	for (const session of sessions) {
		const age = now.getTime() - Date.parse(session.end)
		if (session.restore || session.name || age <= 7 * DAY_MS) {
			rows.push({ level: 'session', session })
			continue
		}
		const day = localDate(session.end, timeZone)
		const level = age <= 30 * DAY_MS ? 'day' : 'week'
		const key = level === 'day' ? day : `week:${weekStart(day)}`
		const last = rows[rows.length - 1]
		if (last && last.level === level && last.key === key) {
			last.sessions.push(session)
			last.authors = mergeAuthors(last.sessions)
			last.added += session.added
			last.updated += session.updated
			last.removed += session.removed
		} else {
			rows.push({
				level,
				key,
				end: session.end,
				sessions: [session],
				authors: session.authors,
				added: session.added,
				updated: session.updated,
				removed: session.removed,
			})
		}
	}
	return rows
}
