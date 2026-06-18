// Adding a column WITH a DEFAULT is not a metadata-only change for Zero: the
// replication-manager re-copies the whole column into its replica before the
// column becomes visible to the view-syncers, and holds the Postgres
// replication slot open while it backfills. If client code that expects the
// column ships before the backfill finishes, clients hit
// SchemaVersionNotSupported (the cause of the inviteLinkEnabled incident). New
// migrations must use expand/contract instead: add the column nullable with no
// default (visible immediately), backfill values in batches, then set the
// default / NOT NULL in a later migration — or, for a column on a table Zero
// does not replicate, opt out with the marker below. A unit test runs this over
// the checked-in migrations to stop a new one reintroducing the pattern.
//
// Remove this check once Zero is upgraded to a version that applies scalar
// defaults without a full-column backfill.

// Migrations that added a column with a DEFAULT before this check existed. They
// predate the guard and only need to keep replaying cleanly on fresh databases.
// Don't add to this list — new migrations must use the expand/contract pattern.
export const GRANDFATHERED_DEFAULT_BACKFILL: ReadonlySet<string> = new Set([
	'006_add_file_soft_delete.sql',
	'007_update_file_owner_details.sql',
	'008_add_pinned.sql',
	'009_add_allow_analytics_cookie.sql',
	'019_add_keyboard_shortcuts_pref.sql',
	'020_add_show_ui_labels_pref.sql',
	'022_add_input_mode_preference.sql',
	'026_fairy_usage_tracking.sql',
	'027_fairy_invite_description.sql',
	'029_fairy_weekly_limit.sql',
	'030_add_zoom_direction_preference.sql',
	'037_add_group_invite_link_enabled.sql',
])

// A migration can opt out when the column is on a table Zero does not replicate
// (not in the `zero_data` publication), so no replica backfill happens. The
// marker must be its own line comment with a reason, e.g.
// `-- zero-cache:allow-add-column-default paddle_transactions is not replicated`.
const OPT_OUT_MARKER = 'zero-cache:allow-add-column-default'
// The marker, a reason, and everything else must be on one line comment, so the
// separators are non-newline whitespace — otherwise a reason-less marker would
// match the SQL on the next line and opt out without a reason.
const OPT_OUT_LINE = new RegExp(`^[ \\t]*--[ \\t]*${OPT_OUT_MARKER}[ \\t]+\\S`, 'm')

// Matches `ADD [COLUMN] ... DEFAULT` within a single statement (`[^;]*` stops at
// the next `;`). Matching is lexical and statement-coarse: a multi-column `ADD`
// where any column has a DEFAULT trips it, and the `DEFAULT` keyword inside a
// string literal would too. Split the statement or use the opt-out marker.
const ADD_COLUMN_WITH_DEFAULT = /\bADD\s+(?:COLUMN\s+)?[^;]*\bDEFAULT\b/is

function stripSqlComments(sql: string) {
	return sql
		.replace(/\/\*[\s\S]*?\*\//g, ' ') // block comments
		.replace(/--[^\n]*/g, ' ') // line comments
}

export function validateMigrationContents(
	migrations: { filename: string; sql: string }[],
	grandfathered: ReadonlySet<string> = GRANDFATHERED_DEFAULT_BACKFILL
) {
	for (const { filename, sql } of migrations) {
		// Only `.sql` files are migrations; the runner ignores everything else.
		if (!filename.endsWith('.sql')) continue
		if (grandfathered.has(filename)) continue
		// The marker lives in a comment, so check the raw SQL before stripping comments.
		if (OPT_OUT_LINE.test(sql)) continue
		if (ADD_COLUMN_WITH_DEFAULT.test(stripSqlComments(sql))) {
			throw new Error(
				`Migration "${filename}" adds a column with a DEFAULT. On the current Zero version ` +
					`this triggers a blocking replica backfill: the new column stays invisible to the ` +
					`view-syncers until it finishes, and the Postgres replication slot is held open ` +
					`meanwhile (the inviteLinkEnabled incident). Use expand/contract instead — add the ` +
					`column nullable with no default, backfill values in batches, then set the default / ` +
					`NOT NULL in a later migration. If the column is on a table Zero does not replicate, ` +
					`add a "-- ${OPT_OUT_MARKER} <reason>" line comment to opt out.`
			)
		}
	}
}
