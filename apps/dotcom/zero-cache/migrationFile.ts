// A migration whose first line is `-- no-transaction` runs outside any transaction, for
// statements Postgres refuses inside one, such as CREATE INDEX CONCURRENTLY. The marker
// follows sqlx and lives in the SQL because it describes how the statements execute.
// Running unprotected has consequences the author has to plan for:
//
// - The dry run skips it, so the real migrate run is the first time it executes.
// - A failed CREATE INDEX CONCURRENTLY leaves an INVALID index behind, and a re-run with
//   IF NOT EXISTS would keep it silently. Put a plain DROP INDEX IF EXISTS ahead of the
//   create: it takes no lock when the index is absent and clears the leftover on a retry.
//   Not DROP INDEX CONCURRENTLY: Zero's ddl_command_start event trigger writes first, and
//   Postgres then refuses the drop as not the first action in the transaction.
// - A multi-statement file that fails part-way has no ledger row, so the re-run starts
//   it from the top. Keep to one statement per file unless the rest are safe to repeat.
const NO_TRANSACTION_MARKER = /^--\s*no-transaction\s*$/

export function isNoTransactionMigration(migrationSql: string): boolean {
	const firstLine = migrationSql.split('\n', 1)[0].trim()
	return NO_TRANSACTION_MARKER.test(firstLine)
}

/**
 * The runner applies every migration inside a transaction it opens itself, so a migration that
 * opens its own leaves the runner's transaction in a state it did not expect. migrate.ts refuses
 * one rather than trying to reconcile that.
 *
 * Only a statement counts: BEGIN, START TRANSACTION, COMMIT, ROLLBACK or END TRANSACTION, with or
 * without WORK/TRANSACTION, in any case, followed by a semicolon. plpgsql function bodies open with
 * a bare `BEGIN` and no semicolon, and a migration defining a trigger function is full of them.
 *
 * A miss is worse than a false positive. The runner sends each file with the simple query
 * protocol, so a stray `commit;` ends the runner's transaction mid-file and everything after it,
 * `--dry-run` included, applies for real.
 */
export function hasTransactionBlock(migrationSql: string): boolean {
	return /\b(begin|start\s+transaction|commit|rollback|end\s+transaction)(\s+(work|transaction))?\s*;/i.test(
		migrationSql
	)
}

const DOLLAR_TAG = /^\$([A-Za-z_][A-Za-z0-9_]*)?\$/

/**
 * Split a migration into statements on top-level semicolons, ignoring semicolons inside
 * comments, strings, quoted identifiers, and dollar-quoted bodies. Comments stay attached
 * to the statement that follows them; a trailing comment with no statement is dropped.
 *
 * Only no-transaction migrations are split. Sent as one multi-statement string, pg's
 * simple protocol runs them in an implicit transaction block, which is the one thing
 * CONCURRENTLY cannot tolerate.
 */
export function splitSqlStatements(migrationSql: string): string[] {
	const statements: string[] = []
	let start = 0
	let hasCode = false
	let i = 0

	// Advance past the token that ends with `terminator`, or to the end if it never closes.
	const skipThrough = (terminator: string, from: number) => {
		const close = migrationSql.indexOf(terminator, from)
		i = close === -1 ? migrationSql.length : close + terminator.length
	}

	while (i < migrationSql.length) {
		const char = migrationSql[i]
		const next = migrationSql[i + 1]
		const dollarTag = char === '$' ? migrationSql.slice(i).match(DOLLAR_TAG)?.[0] : undefined

		if (char === '-' && next === '-') {
			skipThrough('\n', i + 2)
		} else if (char === '/' && next === '*') {
			// Postgres block comments nest, so track depth rather than stopping at the first `*/`.
			let depth = 0
			while (i < migrationSql.length) {
				if (migrationSql.startsWith('/*', i)) {
					depth++
					i += 2
				} else if (migrationSql.startsWith('*/', i)) {
					depth--
					i += 2
					if (depth === 0) break
				} else {
					i++
				}
			}
		} else if (char === "'" || char === '"') {
			// A doubled quote reads as one string closing and another opening, so it needs no special case.
			skipThrough(char, i + 1)
			hasCode = true
		} else if (dollarTag) {
			skipThrough(dollarTag, i + dollarTag.length)
			hasCode = true
		} else if (char === ';') {
			if (hasCode) statements.push(migrationSql.slice(start, i).trim())
			start = i + 1
			hasCode = false
			i++
		} else {
			if (!/\s/.test(char)) hasCode = true
			i++
		}
	}

	if (hasCode) statements.push(migrationSql.slice(start).trim())
	return statements
}
