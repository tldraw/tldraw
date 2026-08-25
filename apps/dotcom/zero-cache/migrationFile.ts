// A migration whose first line is `-- no-transaction` runs outside any transaction.
// It exists for statements Postgres refuses inside one, such as CREATE INDEX
// CONCURRENTLY. The marker lives in the SQL rather than the filename so it travels
// with the statements it describes and leaves validateMigrationFilenames alone.
const NO_TRANSACTION_MARKER = /^--\s*no-transaction\s*$/

export function isNoTransactionMigration(migrationSql: string): boolean {
	const firstLine = migrationSql.split('\n', 1)[0].trim()
	return NO_TRANSACTION_MARKER.test(firstLine)
}

const DOLLAR_TAG = /^\$([A-Za-z_][A-Za-z0-9_]*)?\$/

/**
 * Split a migration into individual statements on top-level semicolons, ignoring
 * semicolons inside comments, quoted strings, quoted identifiers, and dollar-quoted
 * bodies.
 *
 * Only no-transaction migrations are split. Postgres rejects CONCURRENTLY statements
 * sent as one multi-statement query — the driver's extended protocol allows a single
 * command per message, and the simple protocol would wrap them in an implicit
 * transaction, which is the one thing CONCURRENTLY cannot tolerate.
 */
export function splitSqlStatements(migrationSql: string): string[] {
	const statements: string[] = []
	let current = ''
	let hasCode = false
	let i = 0

	const endStatement = () => {
		if (hasCode) statements.push(current.trim())
		current = ''
		hasCode = false
	}

	while (i < migrationSql.length) {
		const char = migrationSql[i]

		if (char === '-' && migrationSql[i + 1] === '-') {
			const end = migrationSql.indexOf('\n', i)
			const stop = end === -1 ? migrationSql.length : end
			current += migrationSql.slice(i, stop)
			i = stop
			continue
		}

		if (char === '/' && migrationSql[i + 1] === '*') {
			// Postgres block comments nest, so track depth rather than stopping at the first `*/`.
			let depth = 0
			const start = i
			while (i < migrationSql.length) {
				if (migrationSql[i] === '/' && migrationSql[i + 1] === '*') {
					depth++
					i += 2
				} else if (migrationSql[i] === '*' && migrationSql[i + 1] === '/') {
					depth--
					i += 2
					if (depth === 0) break
				} else {
					i++
				}
			}
			current += migrationSql.slice(start, i)
			continue
		}

		if (char === "'" || char === '"') {
			const start = i
			i++
			while (i < migrationSql.length) {
				if (migrationSql[i] === char) {
					// A doubled quote is an escaped quote: close and immediately reopen.
					i++
					break
				}
				i++
			}
			current += migrationSql.slice(start, i)
			hasCode = true
			continue
		}

		if (char === '$') {
			const tag = migrationSql.slice(i).match(DOLLAR_TAG)
			if (tag) {
				const close = migrationSql.indexOf(tag[0], i + tag[0].length)
				const stop = close === -1 ? migrationSql.length : close + tag[0].length
				current += migrationSql.slice(i, stop)
				i = stop
				hasCode = true
				continue
			}
		}

		if (char === ';') {
			endStatement()
			i++
			continue
		}

		current += char
		if (!/\s/.test(char)) hasCode = true
		i++
	}

	endStatement()
	return statements
}
