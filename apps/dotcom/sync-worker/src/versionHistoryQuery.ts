import { HistoryRawResponse, HistorySession } from '@tldraw/dotcom-shared'
import { DoSql, readVersionIndexRows, VersionIndexRow } from './versionIndexStorage'
import { groupSessions } from './versionSessions'

/**
 * Sessions older than `before`, newest first. Cursors are timestamps, so versions written while
 * someone pages cannot shift later pages.
 */
export function readSessionsPage(
	sql: DoSql,
	opts: { before?: string; limit: number; batchSize?: number }
): { sessions: HistorySession[]; nextCursor: string | null } {
	const batchSize = opts.batchSize ?? 2000
	const rows: VersionIndexRow[] = []
	let cursor = opts.before
	let exhausted = false
	let complete: HistorySession[] = []
	while (true) {
		const batch = readVersionIndexRows(sql, {
			before: cursor,
			limit: batchSize,
			includeSystem: true,
		})
		rows.push(...batch)
		if (batch.length < batchSize) exhausted = true
		else cursor = batch[batch.length - 1].ts
		const { sessions, lastIsComplete } = groupSessions(rows, { exhausted })
		complete = lastIsComplete ? sessions : sessions.slice(0, -1)
		if (exhausted || complete.length > opts.limit) break
	}
	const sessions = complete.slice(0, opts.limit)
	const hasMore = complete.length > opts.limit
	return { sessions, nextCursor: hasMore ? sessions[sessions.length - 1].start : null }
}

export function readRawPage(
	sql: DoSql,
	opts: { before?: string; limit: number }
): HistoryRawResponse {
	const rows = readVersionIndexRows(sql, {
		before: opts.before,
		limit: opts.limit + 1,
		includeSystem: true,
	})
	const page = rows.slice(0, opts.limit)
	return {
		versions: page.map((r) => ({
			ts: r.ts,
			authors: r.authors,
			added: r.added,
			updated: r.updated,
			removed: r.removed,
			...(r.name ? { name: r.name } : {}),
		})),
		nextCursor: rows.length > opts.limit ? page[page.length - 1].ts : null,
	}
}
