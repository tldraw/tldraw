/**
 * The runner applies every migration inside a transaction it opens itself, so a migration that
 * opens its own leaves the runner's transaction in a state it did not expect. migrate.ts refuses
 * one rather than trying to reconcile that.
 *
 * Only a statement counts: BEGIN, START TRANSACTION, COMMIT, ROLLBACK or END, with or without
 * WORK/TRANSACTION, in any case, followed by a semicolon. Postgres accepts `END;` and `END WORK;`
 * as synonyms for COMMIT, but every plpgsql function body and DO block ends with an `END;` of its
 * own, so the check first strips dollar-quoted bodies, comments and string literals and only then
 * looks for a statement. plpgsql bodies open with a bare `BEGIN` and no semicolon, which is why
 * the check is punctuation-sensitive rather than word-based.
 *
 * A miss is worse than a false positive. The runner sends each file with the simple query
 * protocol, so a stray `commit;` ends the runner's transaction mid-file and everything after it,
 * `--dry-run` included, applies for real. That is also why an unterminated quote or comment is
 * left in place rather than swallowing the rest of the file, and why a top-level `CASE ... END;`
 * or a `BEGIN ATOMIC` function body is flagged: neither appears in a migration here, and a false
 * positive fails loudly at deploy time.
 */
export function hasTransactionBlock(migrationSql: string): boolean {
	return /\b(begin|start\s+transaction|commit|rollback|end)(\s+(work|transaction))?\s*;/i.test(
		stripQuotesAndComments(migrationSql)
	)
}

const DOLLAR_QUOTE_TAG = /\$([A-Za-z_\u0080-\uffff][A-Za-z0-9_\u0080-\uffff]*)?\$/y

/**
 * Keyword matching must only see top-level SQL. Each stripped region becomes a single space so a
 * comment between `END` and its semicolon still reads as a statement, and an unterminated one is
 * left in place rather than swallowing the rest of the file.
 */
function stripQuotesAndComments(sql: string): string {
	let out = ''
	let i = 0
	while (i < sql.length) {
		const ch = sql[i]
		const next = sql[i + 1]

		if (ch === '-' && next === '-') {
			const end = sql.indexOf('\n', i)
			out += ' '
			i = end === -1 ? sql.length : end
			continue
		}

		if (ch === '/' && next === '*') {
			// Postgres block comments nest, so a stray `*/` inside one does not end it.
			let depth = 1
			let j = i + 2
			while (j < sql.length && depth > 0) {
				if (sql[j] === '/' && sql[j + 1] === '*') {
					depth++
					j += 2
				} else if (sql[j] === '*' && sql[j + 1] === '/') {
					depth--
					j += 2
				} else {
					j++
				}
			}
			if (depth > 0) {
				out += ch
				i++
				continue
			}
			out += ' '
			i = j
			continue
		}

		if (ch === "'") {
			// E'...' strings also escape a quote with a backslash; plain strings only double it.
			const prev = sql[i - 1]
			const isEscapeString =
				(prev === 'E' || prev === 'e') && !/[A-Za-z0-9_]/.test(sql[i - 2] ?? '')
			let j = i + 1
			let terminated = false
			while (j < sql.length) {
				if (isEscapeString && sql[j] === '\\') {
					j += 2
				} else if (sql[j] === "'") {
					if (sql[j + 1] === "'") {
						j += 2
					} else {
						terminated = true
						j++
						break
					}
				} else {
					j++
				}
			}
			if (!terminated) {
				out += ch
				i++
				continue
			}
			out += ' '
			i = j
			continue
		}

		if (ch === '$') {
			DOLLAR_QUOTE_TAG.lastIndex = i
			const tag = DOLLAR_QUOTE_TAG.exec(sql)?.[0]
			const end = tag ? sql.indexOf(tag, i + tag.length) : -1
			if (!tag || end === -1) {
				out += ch
				i++
				continue
			}
			out += ' '
			i = end + tag.length
			continue
		}

		out += ch
		i++
	}
	return out
}
