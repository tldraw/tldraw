import { DB, can } from '@tldraw/dotcom-shared'
import { Kysely, RawBuilder, SqlBool, sql } from 'kysely'
import { createPostgresConnectionPool } from '../../postgres'
import { Environment } from '../../types'
import {
	BOARD_SEARCH_PAGE_SIZE,
	BoardSearchCursor,
	BoardSearchRow,
	compareBoardSearchOrder,
} from './boardTools'

// The database half of search_boards. The model-facing half — what the tool is called, how its
// arguments and cursors are parsed, how results are shaped — lives in boardTools.ts, which stays
// free of Postgres so the eval harness can serve the same tool from fixtures.

// The sort key is `file.createdAt`, and it has to be a column nothing rewrites. A keyset cursor
// stops duplicates but cannot save a *mutating* key: a row whose key changes can move from below the
// cursor (not yet served) to above it (already passed) and then appear on no page at all. That rules
// out the obvious-looking `file.updatedAt`, which `005_update_file_trigger.sql` bumps on any column
// change — under it a board edited mid-paging silently vanishes from an agent's results. `createdAt`
// is written once by the `createFile` mutator and is in `immutableColumns.file`, and no trigger
// touches it, so only inserts and deletes move the set, which a keyset handles by construction.

// `COLLATE "C"` because `compareBoardSearchOrder` in boardTools.ts compares ids by UTF-16 code unit
// and the eval harness pages with it. A tldraw id is drawn from `A-Za-z0-9_-`, which is exactly
// where an ICU or glibc collation diverges from code-unit order, so without this the database and
// the harness would order the same rows differently. A future index on this ordering has to declare
// the same collation or it will not be usable.
const FILE_ID = sql<string>`file.id collate "C"`
// The same expression over the guest read, where the id comes off the link rather than the file.
const LINK_FILE_ID = sql<string>`group_file."fileId" collate "C"`

/**
 * One page of the boards a caller may search: the ones their workspaces own, and the ones shared
 * with them by link.
 *
 * This is the scope `hasReadAccessToFile` admits, and the relationship only runs one way: everything
 * returned here must be a board the other tools will open. A model that finds a board and is then
 * refused it has no way to interpret that.
 *
 * Two reads, because that gate has two arms with nothing in common but their answer, and they are
 * merged here rather than unioned in SQL so both can use `compareBoardSearchOrder` — the single
 * statement of this ordering, which the eval harness already pages fixtures with. A `UNION`'s own
 * `ORDER BY` would be a third copy of it to drift.
 *
 * Sequential rather than `Promise.all`: `createPostgresConnectionPool` defaults to one connection,
 * so issuing them together queues the second behind the first for the same wall-clock.
 */
export async function searchAccessibleBoards(
	env: Environment,
	userId: string,
	{ terms, cursor }: { terms: string[]; cursor: BoardSearchCursor | null }
): Promise<BoardSearchRow[]> {
	// createPostgresConnectionPool news up a pg.Pool; destroy it so idle pools don't pile up in the
	// isolate across tool calls.
	const db = createPostgresConnectionPool(env, 'sync-worker/searchAccessibleBoards')
	try {
		const groupIds = await getAccessibleGroupIds(db, userId)
		// Nothing is in scope, so there are no pages to merge and nothing to ask Postgres.
		if (!groupIds.length) return []

		const owned = await searchWorkspaceBoards(db, userId, groupIds, terms, cursor)
		const shared = await searchBoardsSharedWithCaller(db, userId, groupIds, terms, cursor)

		// Lossless because each read took a whole page: the global top page cannot hold a row that is
		// in neither side's own top page. The surplus row survives the merge too, which is what lets
		// the caller answer "is there another page" without a second count.
		return [...owned, ...shared].sort(compareBoardSearchOrder).slice(0, BOARD_SEARCH_PAGE_SIZE + 1)
	} finally {
		await db.destroy()
	}
}

// What both reads select from `file`, and what those columns mean once read back. `ownerName` is
// misleadingly named: `set_file_owner_details_trigger` (`023_groups.sql`) writes the owning *user's*
// name there for a user-owned row and the owning group's name for a group-owned one. Every row these
// reads return is group-owned, so on all of them it is a workspace name.
const BOARD_COLUMNS = [
	'file.id',
	'file.name',
	'file.createdAt',
	'file.updatedAt',
	'file.ownerName',
	'file.owningGroupId',
] as const

// Both timestamps arrive from pg as strings, because they are int8 columns. Left as strings the sort
// key would compare lexicographically and the cursor would encode a quoted number.
function toBoardSearchRow(
	row: {
		id: string
		name: string
		createdAt: string | number
		updatedAt: string | number
		ownerName: string
		owningGroupId: string | null
	},
	arrivedAt: string | number,
	source: BoardSearchRow['source']
): BoardSearchRow {
	return {
		id: row.id,
		name: row.name,
		arrivedAt: Number(arrivedAt),
		createdAt: Number(row.createdAt),
		updatedAt: Number(row.updatedAt),
		workspaceName: row.ownerName,
		source,
	}
}

/**
 * The filters both reads share, applied through one helper because a filter that reached one and not
 * the other would make that read's page a different search from the rest of the merge — and the
 * surplus row only means "there is another page" if both were searching the same thing.
 */
function narrowToTerms<T extends { where: any }>(query: T, terms: string[]): T {
	let narrowed = query
		.where('file.isDeleted', '=', false)
		// Mirrors isTestFile: reading a test file needs admin auth, so it is not the caller's to find.
		// In SQL rather than after the fact, or one could take a slot on the page.
		.where('file.id', 'not like', 'test\\_%')
	for (const term of terms) {
		narrowed = narrowed.where('file.name', 'ilike', `%${escapeLikePattern(term)}%`)
	}
	return narrowed
}

/**
 * The boards owned by a workspace the caller can access files in — including their own, since a home
 * group's id is the user's own id.
 *
 * One page per workspace, merged, rather than one query over every workspace at once. The index can
 * only be read in order under a single-equality access predicate, and `"owningGroupId" = ANY(:groups)`
 * is not one: an array-driven btree scan is unordered before PG 17 and we run 16, so a caller in three
 * workspaces seq-scanned 30,000 rows to return the first 21. Asking each workspace for its own top page
 * and merging reads 63.
 *
 * `file."createdAt"` is this side's arrival time, not merely a proxy for it: `createFile` writes one
 * timestamp into the file row and its `group_file` row alike, so for a board made here the two are the
 * same value. A board *moved* in is the one case they diverge — it keeps its original creation time
 * rather than sorting by the move — which is a smaller discrepancy than reading the sort key from a
 * table the index cannot reach.
 */
async function searchWorkspaceBoards(
	db: Kysely<DB>,
	userId: string,
	groupIds: string[],
	terms: string[],
	cursor: BoardSearchCursor | null
): Promise<BoardSearchRow[]> {
	const rows = await db
		.selectFrom(
			// Wrapped in a sub-select purely to name the column: `unnest(...) as "g"` gives the one column
			// the table's own alias, so the arm below would have to read `g.g`.
			sql<{ groupId: string }>`(select unnest(${sql.val(groupIds)}::text[]) as "groupId")`.as('g')
		)
		.crossJoinLateral((eb) => {
			let arm = narrowToTerms(
				eb
					.selectFrom('file')
					.select(BOARD_COLUMNS)
					// `file_owning_group_created_at_idx` (`052_file_search_index.sql`) serves this equality
					// and the ordering together, so each arm reads its page and stops instead of top-N
					// sorting a whole workspace. What no index helps is the `ilike '%term%'` above: a query
					// matching nothing still reads every board in scope. The index bounds paging, not
					// matching.
					.where('file.owningGroupId', '=', sql.ref<string>('g.groupId')),
				terms
			)
			if (cursor) {
				arm = arm.where(seekBelow(FILE_ID, sql.ref('file.createdAt'), cursor))
			}
			return (
				arm
					.orderBy('file.createdAt', 'desc')
					.orderBy(FILE_ID, 'desc')
					// One more than a page, so the caller can answer "there is another page" without a second
					// count query over the same set.
					.limit(BOARD_SEARCH_PAGE_SIZE + 1)
					.as('s')
			)
		})
		.select(['s.id', 's.name', 's.createdAt', 's.updatedAt', 's.ownerName', 's.owningGroupId'])
		.execute()

	// A home group carries its user's id, which is what makes a board the caller's own rather than a
	// shared workspace's.
	return rows.map((row) =>
		toBoardSearchRow(row, row.createdAt, row.owningGroupId === userId ? 'owned' : 'workspace')
	)
}

/**
 * The boards shared with the caller by link.
 *
 * Opening one writes a `group_file` row into the opener's *home* group while the file stays owned
 * elsewhere, and `039_tighten_group_file_association.sql` permits exactly that row and no other
 * cross-workspace link — so the caller's home group is the whole of this access predicate. The scope
 * invariant holds: `hasReadAccessToFile` grants on `shared` alone, so every row here is one the other
 * tools will open, and unsharing deletes these rows (`034_fix_unshare_group_file_cleanup.sql`), so
 * the set cannot outlive the access that justifies it.
 *
 * Files whose owning workspace the caller already belongs to are excluded, and that exclusion is not
 * an edge case — without it this read returns every board the caller owns. `createFile` writes a
 * `group_file` row into the owning workspace, which for a personal board *is* the home group, and it
 * sets `shared: true`; so both predicates below match a caller's own boards exactly as well as their
 * guest links, and every one of them would come back here as well as from `searchWorkspaceBoards`,
 * twice on one page. The mislinked case it also covers — a guest file whose workspace the caller
 * later joined — is the rarer half of its job. `getWorkspaceFilesSorted` in the client guards the
 * same rows the same way.
 *
 * Sorted and sought on `group_file."createdAt"`, which is when the caller opened the link. That is
 * the same thing the other read's `file."createdAt"` means for a board made in a workspace, so the
 * two merge — and it is the only sort key here an index could reach, since `group_file` carries the
 * access key.
 *
 * No index serves it yet, so this read fetches every guest link the caller has and sorts them: 879
 * buffers for the heaviest account in production (233 links), against 89 with one. An index on
 * `group_file("groupId", "createdAt" DESC)` is the fix and is deliberately a separate deploy — a
 * migration run that locks both `file` and `group_file` can deadlock against a concurrent file move,
 * which takes those two in the opposite order, and one that locks only one of them cannot. The
 * ordering here is already what that index will want, so adding it is a migration and nothing else.
 */
async function searchBoardsSharedWithCaller(
	db: Kysely<DB>,
	userId: string,
	groupIds: string[],
	terms: string[],
	cursor: BoardSearchCursor | null
): Promise<BoardSearchRow[]> {
	let query = narrowToTerms(
		db
			.selectFrom('group_file')
			.innerJoin('file', 'file.id', 'group_file.fileId')
			.select([...BOARD_COLUMNS, 'group_file.createdAt as arrivedAt'])
			.where('group_file.groupId', '=', userId)
			.where('file.shared', '=', true)
			// Load-bearing rather than tidy-up: the caller's home group id is in `groupIds`, so this is
			// what keeps their own boards' owning rows out of a read whose predicates above match them.
			// Safe as a plain `not in` only because `050_drop_legacy_owner_columns.sql` made
			// `owningGroupId` NOT NULL: while legacy files carried NULL there, this would have dropped
			// every one of them silently, since `NULL not in (...)` is NULL rather than true.
			.where('file.owningGroupId', 'not in', groupIds),
		terms
	)
	if (cursor) {
		query = query.where(seekBelow(LINK_FILE_ID, sql.ref('group_file.createdAt'), cursor))
	}
	const rows = await query
		.orderBy('group_file.createdAt', 'desc')
		.orderBy(LINK_FILE_ID, 'desc')
		.limit(BOARD_SEARCH_PAGE_SIZE + 1)
		.execute()

	// Shared by construction: this read only ever returns boards owned outside the caller's own
	// workspaces, reached through the guest link opening one leaves behind.
	return rows.map((row) => toBoardSearchRow(row, row.arrivedAt, 'shared'))
}

/**
 * The keyset seek, over whichever pair of columns this read sorts by.
 *
 * Seek, not offset: an insert anywhere above the cursor shifts every later row by one, so an offset
 * would re-serve one board and skip another at the boundary. This asks for rows strictly below where
 * the last page ended, over the same two expressions the ORDER BY sorts on — sort by one thing and
 * seek by another and a page boundary lands somewhere the sort did not put it.
 *
 * A row comparison, not the equivalent `arrivedAt < :a or (arrivedAt = :a and id < :i)`. Postgres
 * keeps that OR as a filter, so a late page walks every row above the cursor and throws it away: page
 * 500 of a 10k-board workspace read 9,927 rows to return 21. A row comparison is matchable against
 * the index — PG16 truncates it to the leading columns the index actually has, seeks on the
 * timestamp, and rechecks the whole comparison as a filter. Same rows, 26 read.
 *
 * The `id` half is the tiebreaker: boards created in one batch share a timestamp, so without
 * comparing ids among rows that share a key, a page boundary landing inside such a group would drop
 * the rest of it. It mirrors `compareBoardSearchOrder` in boardTools.ts — change one and the eval
 * harness starts paging differently from production.
 */
function seekBelow(
	id: RawBuilder<string>,
	arrivedAt: RawBuilder<unknown>,
	cursor: BoardSearchCursor
) {
	return sql<SqlBool>`(${arrivedAt}, ${id}) < (${cursor.arrivedAt}, ${cursor.id})`
}

// The workspaces whose files this caller may reach. Deleted groups are excluded here rather than
// left to the file rows, so a deleted workspace cannot widen the id list at all.
//
// Since the groups model this is also the arm that returns a caller's *own* boards — a user's home
// group has `group.id === user.id`. So a home group flagged deleted empties search completely while
// every other tool on this server keeps working.
async function getAccessibleGroupIds(db: Kysely<DB>, userId: string): Promise<string[]> {
	const memberships = await db
		.selectFrom('group_user')
		.innerJoin('group', 'group.id', 'group_user.groupId')
		.select(['group_user.groupId', 'group_user.role'])
		.where('group_user.userId', '=', userId)
		.where('group.isDeleted', '=', false)
		.execute()
	return selectAccessibleGroupIds(memberships)
}

/**
 * Filters memberships down to the workspaces whose files the caller may read.
 *
 * Asks `can(role, 'accessFiles')` rather than comparing role names, so the meaning of a role stays
 * in the roles table — and an unknown role string out of the database answers false rather than
 * throwing.
 */
export function selectAccessibleGroupIds(
	memberships: Array<{ groupId: string; role: string }>
): string[] {
	return memberships
		.filter((membership) => can(membership.role, 'accessFiles'))
		.map((membership) => membership.groupId)
}

/**
 * Escapes a search term for use inside a LIKE/ILIKE pattern.
 *
 * `%` and `_` are wildcards, so a term carrying one must not be read as a pattern: a search for `%`
 * would otherwise match every board the caller has. The backslash is in the class because it is the
 * escape character itself; `String.replace` replaces each match independently in a single pass, so
 * the escapes this adds are never rescanned.
 */
export function escapeLikePattern(value: string): string {
	return value.replace(/[\\%_]/g, (char) => `\\${char}`)
}
