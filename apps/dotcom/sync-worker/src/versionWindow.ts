import { DoSql, VersionAuthor } from './versionIndexStorage'

// Who changed the document since the last persist. In SQLite rather than memory: a hibernated DO
// can be evicted between a commit and the persist that records it.
export class VersionWindow {
	private ready = false
	private known = new Set<string>()

	constructor(private readonly sql: DoSql) {}

	private ensure() {
		if (this.ready) return
		this.sql.exec(
			'CREATE TABLE IF NOT EXISTS version_window (author_key TEXT PRIMARY KEY, user_id TEXT, agent TEXT)'
		)
		this.ready = true
	}

	noteCommit(author: VersionAuthor) {
		const key = `${author.userId ?? ''}|${author.agent ?? ''}`
		// Commits arrive many times a second while drawing; only a new author costs a row write.
		if (this.known.has(key)) return
		this.ensure()
		this.sql.exec(
			'INSERT OR IGNORE INTO version_window (author_key, user_id, agent) VALUES (?, ?, ?)',
			key,
			author.userId,
			author.agent ?? null
		)
		this.known.add(key)
	}

	take(): { authors: VersionAuthor[]; hasUserChanges: boolean } {
		this.ensure()
		const rows = this.sql
			.exec('SELECT user_id, agent FROM version_window ORDER BY rowid')
			.toArray() as { user_id: string | null; agent: 'mcp' | null }[]
		this.sql.exec('DELETE FROM version_window')
		this.known.clear()
		const authors = rows.map((r) =>
			r.agent ? { userId: r.user_id, agent: r.agent } : { userId: r.user_id }
		)
		return { authors, hasUserChanges: authors.length > 0 }
	}

	restore(taken: { authors: VersionAuthor[] }) {
		for (const author of taken.authors) this.noteCommit(author)
	}
}
