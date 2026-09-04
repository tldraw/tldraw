import { DB, can } from '@tldraw/dotcom-shared'
import { Kysely, sql } from 'kysely'
import { createPostgresConnectionPool } from '../../postgres'
import { Environment } from '../../types'
import { BOARD_SEARCH_PAGE_SIZE, BoardSearchCursor, BoardSearchRow } from './boardTools'

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

/**
 * One page of the boards a caller may search: the ones in their own personal workspace, and the ones
 * owned by a workspace they can access files in.
 *
 * This is deliberately the scope `hasReadAccessToFile` admits, minus its link-shared arm, and the
 * relationship only runs one way: everything returned here must be a board the other tools will
 * open. A model that finds a board and is then refused it has no way to interpret that.
 *
 * That is also why the workspace arm reads `file.owningGroupId` rather than the `group_file` join
 * table, unlike the admin route's otherwise-identical query: `hasReadAccessToFile` reads
 * `owningGroupId`, so a row reachable only through `group_file` would pass search and fail every
 * tool after it. Not joining also means no fanout, so this needs no `distinctOn`.
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
		// Nothing is in scope, and `in ()` is a SQL error, so there is no query to run.
		if (!groupIds.length) return []

		let query = db
			.selectFrom('file')
			.select([
				'file.id',
				'file.name',
				'file.createdAt',
				'file.updatedAt',
				// Misleadingly named: `set_file_owner_details_trigger` (`023_groups.sql`) writes the
				// owning *user's* name here for a user-owned row and the owning group's name for a
				// group-owned one. Only group-owned rows pass the scope below, so on anything this
				// returns it is a workspace name.
				'file.ownerName',
				'file.owningGroupId',
			])
			.where('file.isDeleted', '=', false)
			// Mirrors isTestFile: reading a test file needs admin auth, so it is not the caller's to
			// find. In SQL rather than after the fact, or one could take a slot on the page.
			.where('file.id', 'not like', 'test\\_%')
			// The whole of the scope. `hasReadAccessToFile` grants on this same workspace membership
			// or on link sharing, and the link-shared arm is deliberately not mirrored here — search
			// stays narrower than what the other tools will open, never wider. A caller's own boards
			// arrive through this arm too: a home group's id is the user's own id.
			.where('file.owningGroupId', 'in', groupIds)

		for (const term of terms) {
			query = query.where('file.name', 'ilike', `%${escapeLikePattern(term)}%`)
		}

		if (cursor) {
			// Seek, not offset: an insert anywhere above the cursor shifts every later row by one, so an
			// offset would re-serve one board and skip another at the boundary. This asks for rows
			// strictly below where the last page ended, and must stay character-for-character the
			// expression in the ORDER BY, or a page boundary lands somewhere the sort did not put it.
			//
			// The second arm is the tiebreaker: boards created in one batch share a `createdAt`, so
			// without comparing `id` among rows that share a key, a page boundary landing inside such a
			// group would drop the rest of it. It mirrors `compareBoardSearchOrder`
			// in boardTools.ts — change one and the eval harness starts paging differently from
			// production.
			query = query.where((eb) =>
				eb.or([
					eb('file.createdAt', '<', cursor.createdAt),
					eb.and([eb('file.createdAt', '=', cursor.createdAt), eb(FILE_ID, '<', cursor.id)]),
				])
			)
		}

		const rows = await query
			// `file_owning_group_created_at_idx` (`050_file_search_index.sql`) serves this ordering as
			// well as the access filter, so a caller in one workspace reads a page and stops instead
			// of top-N sorting everything they can see. It can only do that while the access predicate
			// stays a single equality: a top-level `OR` there makes Postgres answer with a `BitmapOr`,
			// whose output has no order, and the index goes unused. (A caller in several workspaces
			// still sorts — an array-driven btree scan is unordered before PG 17, and we run 16.)
			.orderBy('file.createdAt', 'desc')
			.orderBy(FILE_ID, 'desc')
			// One more than a page, so the caller can answer "there is another page" without a second
			// count query over the same set.
			.limit(BOARD_SEARCH_PAGE_SIZE + 1)
			.execute()

		return rows.map((row) => ({
			id: row.id,
			name: row.name,
			createdAt: Number(row.createdAt),
			updatedAt: Number(row.updatedAt),
			workspaceName: row.ownerName,
			// A home group carries its user's id, which is what makes a board the caller's own rather
			// than a shared workspace's.
			isPersonal: row.owningGroupId === userId,
		}))
	} finally {
		await db.destroy()
	}
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
