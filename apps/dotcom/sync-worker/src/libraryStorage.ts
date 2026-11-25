import { DB, Role, ZErrorCode } from '@tldraw/dotcom-shared'
import { uniqueId } from '@tldraw/utils'
import { Kysely } from 'kysely'

// An item's content is kept in the ROOMS bucket, which only this worker reads: the uploads bucket
// is served publicly by object name, which would bypass the membership check the content route
// makes. Its thumbnails are public uploads (see libraryThumbnails). The key isn't derived from the
// item's id because a library's copy shares its items' content: the row names it.
export function newLibraryItemContentKey() {
	return `library-items/${uniqueId()}/content.json`
}

export const MAX_LIBRARY_ITEM_CONTENT_BYTES = 5_000_000

// The mutators' getRole counts the home workspace as its owner's whether or not a group_user row
// exists for it, so this does too.
function resolveRole(owningGroupId: string, userId: string, role: Role | null | undefined) {
	return owningGroupId === userId ? 'owner' : (role ?? null)
}

/** A library and the user's role in its owning workspace, or null if it doesn't exist. */
export async function getLibraryAccess(db: Kysely<DB>, userId: string, libraryId: string) {
	const row = await db
		.selectFrom('library')
		.select(['library.id', 'library.name', 'library.owningGroupId', 'library.meta'])
		.select((eb) =>
			eb
				.selectFrom('group_user')
				.select('group_user.role')
				.whereRef('group_user.groupId', '=', 'library.owningGroupId')
				.where('group_user.userId', '=', userId)
				.as('role')
		)
		.where('library.id', '=', libraryId)
		.executeTakeFirst()
	if (!row) return null
	const { role, ...library } = row
	return { library, role: resolveRole(library.owningGroupId, userId, role) }
}

/** An item and the user's role in its library's owning workspace, or null if it doesn't exist. */
export async function getLibraryItemAccess(db: Kysely<DB>, userId: string, itemId: string) {
	const row = await db
		.selectFrom('library_item')
		.innerJoin('library', 'library.id', 'library_item.libraryId')
		.selectAll('library_item')
		.select('library.owningGroupId')
		.select((eb) =>
			eb
				.selectFrom('group_user')
				.select('group_user.role')
				.whereRef('group_user.groupId', '=', 'library.owningGroupId')
				.where('group_user.userId', '=', userId)
				.as('role')
		)
		.where('library_item.id', '=', itemId)
		.executeTakeFirst()
	if (!row) return null
	const { role, owningGroupId, ...item } = row
	return { item, role: resolveRole(owningGroupId, userId, role) }
}

/** The user's role in a workspace, the home workspace counting as its owner's. */
export async function getWorkspaceRole(db: Kysely<DB>, userId: string, groupId: string) {
	const row = await db
		.selectFrom('group_user')
		.select('role')
		.where('groupId', '=', groupId)
		.where('userId', '=', userId)
		.executeTakeFirst()
	return resolveRole(groupId, userId, row?.role)
}

// Counts for the library caps. With `lock`, the row being added to is locked first, as the
// mutators lock it, so concurrent adds into it count one at a time; NO KEY so inserts whose foreign
// keys reference it aren't blocked.

/** How many libraries a workspace has. */
export async function countWorkspaceLibraries(
	db: Kysely<DB>,
	groupId: string,
	{ lock = false }: { lock?: boolean } = {}
) {
	if (lock) {
		await db.selectFrom('group').select('id').where('id', '=', groupId).forNoKeyUpdate().execute()
	}
	const row = await db
		.selectFrom('library')
		.select((eb) => eb.fn.countAll().as('count'))
		.where('owningGroupId', '=', groupId)
		.executeTakeFirst()
	return Number(row?.count ?? 0)
}

/** How many items a library has. */
export async function countLibraryItems(
	db: Kysely<DB>,
	libraryId: string,
	{ lock = false }: { lock?: boolean } = {}
) {
	if (lock) {
		await db
			.selectFrom('library')
			.select('id')
			.where('id', '=', libraryId)
			.forNoKeyUpdate()
			.execute()
	}
	const row = await db
		.selectFrom('library_item')
		.select((eb) => eb.fn.countAll().as('count'))
		.where('libraryId', '=', libraryId)
		.executeTakeFirst()
	return Number(row?.count ?? 0)
}

/** The answer to a request that would take a workspace or library past its cap. */
export function limitReached(
	code: typeof ZErrorCode.max_libraries_reached | typeof ZErrorCode.max_library_items_reached
) {
	return Response.json({ error: code }, { status: 409 })
}
