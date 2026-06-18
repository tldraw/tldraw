// Adding a column WITH a DEFAULT is not a metadata-only change for Zero: the
// replication-manager re-copies the whole column into its replica before the
// column becomes visible to the view-syncers, and holds the Postgres
// replication slot open while it backfills. If client code that expects the
// column ships before the backfill finishes, clients hit
// SchemaVersionNotSupported (the cause of the inviteLinkEnabled incident). New
// migrations must use expand/contract instead: add the column nullable with no
// default (visible immediately), backfill values in batches, then set the
// default / NOT NULL in a later migration. CI runs this against the migrations
// to stop a new one reintroducing the pattern.
//
// Remove this check once Zero is upgraded to a version that applies scalar
// defaults without a full-column backfill.

// Migrations that added a column with a DEFAULT before this check existed. They
// have already been applied everywhere, so they only need to keep replaying
// cleanly on fresh databases. Don't add to this list — new migrations must use
// the expand/contract pattern.
export const GRANDFATHERED_DEFAULT_BACKFILL: ReadonlySet<number> = new Set([
	6, 7, 8, 9, 19, 20, 22, 26, 27, 29, 30, 37,
])

// A migration can opt out when the column is on a table Zero does not replicate
// (not in the `zero_data` publication), so no replica backfill happens. Add it
// as a SQL comment with a reason, e.g.
// `-- zero-cache:allow-add-column-default paddle_transactions is not replicated`.
const OPT_OUT_MARKER = 'zero-cache:allow-add-column-default'

const ADD_COLUMN_WITH_DEFAULT = /\bADD\s+COLUMN\b[^;]*\bDEFAULT\b/is

function stripSqlComments(sql: string) {
	return sql
		.replace(/\/\*[\s\S]*?\*\//g, ' ') // block comments
		.replace(/--[^\n]*/g, ' ') // line comments
}

export function validateMigrationContents(
	migrations: { filename: string; sql: string }[],
	grandfathered: ReadonlySet<number> = GRANDFATHERED_DEFAULT_BACKFILL
) {
	for (const { filename, sql } of migrations) {
		const match = filename.match(/^(\d{3})_.+\.sql$/)
		// Filename shape is validated separately; skip anything that isn't a migration.
		if (!match) continue
		if (grandfathered.has(Number(match[1]))) continue
		// The marker lives in a comment, so check the raw SQL before stripping comments.
		if (sql.includes(OPT_OUT_MARKER)) continue
		if (ADD_COLUMN_WITH_DEFAULT.test(stripSqlComments(sql))) {
			throw new Error(
				`Migration "${filename}" adds a column with a DEFAULT. On the current Zero version ` +
					`this triggers a blocking replica backfill: the new column stays invisible to the ` +
					`view-syncers until it finishes, and the Postgres replication slot is held open ` +
					`meanwhile (the inviteLinkEnabled incident). Use expand/contract instead — add the ` +
					`column nullable with no default, backfill values in batches, then set the default / ` +
					`NOT NULL in a later migration. If the column is on a table Zero does not replicate, ` +
					`add a "-- ${OPT_OUT_MARKER} <reason>" comment to opt out.`
			)
		}
	}
}
