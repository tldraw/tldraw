import { DB, Role } from '@tldraw/dotcom-shared'
import { Kysely } from 'kysely'

// An item's content and thumbnail are kept in the ROOMS bucket, which only this worker reads: the
// uploads bucket is served publicly by object name, which would bypass the membership check the
// routes make.
export function getCollectionItemContentKey(itemId: string) {
	return `collection-items/${itemId}/content.json`
}

export function getCollectionItemThumbnailKey(itemId: string) {
	return `collection-items/${itemId}/thumbnail`
}

export const MAX_COLLECTION_ITEM_CONTENT_BYTES = 5_000_000
export const MAX_COLLECTION_ITEM_THUMBNAIL_BYTES = 1_000_000
// No SVG: thumbnails are served from the API's own origin.
export const COLLECTION_ITEM_THUMBNAIL_TYPES: ReadonlySet<string> = new Set([
	'image/png',
	'image/webp',
	'image/jpeg',
])

// The mutators' getRole counts the home workspace as its owner's whether or not a group_user row
// exists for it, so this does too.
function resolveRole(owningGroupId: string, userId: string, role: Role | null | undefined) {
	return owningGroupId === userId ? 'owner' : (role ?? null)
}

/** A collection and the user's role in its owning workspace, or null if it doesn't exist. */
export async function getCollectionAccess(db: Kysely<DB>, userId: string, collectionId: string) {
	const row = await db
		.selectFrom('collection')
		.select(['collection.id', 'collection.name', 'collection.owningGroupId', 'collection.meta'])
		.select((eb) =>
			eb
				.selectFrom('group_user')
				.select('group_user.role')
				.whereRef('group_user.groupId', '=', 'collection.owningGroupId')
				.where('group_user.userId', '=', userId)
				.as('role')
		)
		.where('collection.id', '=', collectionId)
		.executeTakeFirst()
	if (!row) return null
	const { role, ...collection } = row
	return { collection, role: resolveRole(collection.owningGroupId, userId, role) }
}

/** An item and the user's role in its collection's owning workspace, or null if it doesn't exist. */
export async function getCollectionItemAccess(db: Kysely<DB>, userId: string, itemId: string) {
	const row = await db
		.selectFrom('collection_item')
		.innerJoin('collection', 'collection.id', 'collection_item.collectionId')
		.selectAll('collection_item')
		.select('collection.owningGroupId')
		.select((eb) =>
			eb
				.selectFrom('group_user')
				.select('group_user.role')
				.whereRef('group_user.groupId', '=', 'collection.owningGroupId')
				.where('group_user.userId', '=', userId)
				.as('role')
		)
		.where('collection_item.id', '=', itemId)
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
