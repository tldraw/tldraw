import { HistoryAuthor, HistoryCheckpoint, HistorySession } from '@tldraw/dotcom-shared'
import { VersionIndexRow } from './versionIndexStorage'

export const SESSION_GAP_MS = 30 * 60_000
export const CHECKPOINT_MS = 60 * 60_000
export const POINT_MS = 5 * 60_000

const ms = (ts: string) => Date.parse(ts)

function mergeAuthors(rows: VersionIndexRow[]): HistoryAuthor[] {
	const seen = new Map<string, HistoryAuthor>()
	for (const row of rows) {
		for (const author of row.authors) {
			const key = `${author.userId ?? ''}|${author.agent ?? ''}`
			if (!seen.has(key)) seen.set(key, author)
		}
	}
	return [...seen.values()]
}

function summarize(rows: VersionIndexRow[], ts: string): HistoryCheckpoint {
	return {
		ts,
		authors: mergeAuthors(rows),
		added: rows.reduce((n, r) => n + r.added, 0),
		updated: rows.reduce((n, r) => n + r.updated, 0),
		removed: rows.reduce((n, r) => n + r.removed, 0),
	}
}

/** `rowsNewestFirst` is a session's rows, newest first. */
function toSession(rowsNewestFirst: VersionIndexRow[]): HistorySession {
	const oldestFirst = [...rowsNewestFirst].reverse()
	const start = oldestFirst[0].ts
	const end = rowsNewestFirst[0].ts
	const checkpoints: HistoryCheckpoint[] = []
	let consumed = 0
	for (let boundary = ms(start) + CHECKPOINT_MS; boundary < ms(end); boundary += CHECKPOINT_MS) {
		let last = consumed
		while (last < oldestFirst.length && ms(oldestFirst[last].ts) <= boundary) last++
		if (last === consumed) continue
		checkpoints.push(summarize(oldestFirst.slice(consumed, last), oldestFirst[last - 1].ts))
		consumed = last
	}
	const first = rowsNewestFirst[0]
	return {
		...summarize(rowsNewestFirst, end),
		start,
		end,
		checkpoints: checkpoints.reverse(),
		// What expanding the session shows, sent up front so filters can hide an empty expander.
		points: samplePoints(oldestFirst).filter((p) => p.ts !== end),
		...(first.name ? { name: first.name } : {}),
		...(first.kind === 'restore' && first.restoreId && first.restoredFrom
			? { restore: { restoreId: first.restoreId, restoredFrom: first.restoredFrom } }
			: {}),
	}
}

/**
 * Groups index rows into editing sessions. Pass `exhausted: false` when older rows may exist beyond
 * the input: the oldest session could then continue and is reported incomplete.
 */
export function groupSessions(
	rowsNewestFirst: VersionIndexRow[],
	opts: { exhausted: boolean }
): { sessions: HistorySession[]; lastIsComplete: boolean } {
	const groups: VersionIndexRow[][] = []
	let current: VersionIndexRow[] = []
	const close = () => {
		if (current.length) groups.push(current)
		current = []
	}
	for (const row of rowsNewestFirst) {
		if (row.kind === 'system') continue
		const newer = current[current.length - 1]
		if (
			newer &&
			(newer.kind === 'restore' ||
				row.kind === 'restore' ||
				newer.name ||
				row.name ||
				row.kind === 'pre_restore' ||
				ms(newer.ts) - ms(row.ts) > SESSION_GAP_MS)
		) {
			close()
		}
		current.push(row)
	}
	close()
	const sessions = groups.map(toSession)
	const oldest = sessions[sessions.length - 1]
	return {
		sessions,
		lastIsComplete: opts.exhausted || !oldest || !!oldest.restore || !!oldest.name,
	}
}

/** The last version in each epoch-aligned 5-minute window, newest first. */
export function samplePoints(rowsOldestFirst: VersionIndexRow[]): HistoryCheckpoint[] {
	const windows = new Map<number, VersionIndexRow[]>()
	for (const row of rowsOldestFirst) {
		if (row.kind === 'system') continue
		const key = Math.floor(ms(row.ts) / POINT_MS)
		const rows = windows.get(key) ?? []
		rows.push(row)
		windows.set(key, rows)
	}
	return [...windows.values()].map((rows) => summarize(rows, rows[rows.length - 1].ts)).reverse()
}
