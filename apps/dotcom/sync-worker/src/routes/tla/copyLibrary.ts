import { can, isRole, TlaLibraryItem, TlaLibraryItemAsset } from '@tldraw/dotcom-shared'
import { IRequest } from 'itty-router'
import PQueue from 'p-queue'
import { copyItemAssets, StoredItemContent } from '../../libraryItemAssets'
import {
	getLibraryAccess,
	getLibraryItemContentKey,
	getWorkspaceRole,
	isAnyItemIdTaken,
	isClientPickedId,
	isLibraryIdTaken,
	STORAGE_CONCURRENCY,
} from '../../libraryStorage'
import { copyThumbnail, toThumbnailColumn } from '../../libraryThumbnails'
import { createPostgresConnectionPool } from '../../postgres'
import { Environment } from '../../types'
import { requireAuth } from '../../utils/tla/getAuth'

export interface CopyLibraryRequestBody {
	owningGroupId: string
	/** The new library's id, made by uniqueId. */
	id: string
	/** The id of each item to copy, by the id its copy gets, made by uniqueId. */
	itemIds: Record<string, string>
}

export interface CopyLibraryResponseBody {
	id: string
}

const badRequest = (error: string) => Response.json({ error }, { status: 400 })
const conflict = () => Response.json({ error: 'An id is taken' }, { status: 409 })

class IdTakenError extends Error {}

function readBody(body: unknown): CopyLibraryRequestBody | null {
	if (!body || typeof body !== 'object') return null
	const { owningGroupId, id, itemIds } = body as Partial<CopyLibraryRequestBody>
	if (typeof owningGroupId !== 'string' || !owningGroupId || !isClientPickedId(id)) return null
	if (!itemIds || typeof itemIds !== 'object' || Array.isArray(itemIds)) return null
	const newIds = Object.values(itemIds)
	if (!newIds.every(isClientPickedId) || new Set(newIds).size !== newIds.length) return null
	return { owningGroupId, id, itemIds }
}

/**
 * Copies a library, with its items, into a workspace: new rows, and copies of each item's
 * content, thumbnail and the uploads it owns, made here rather than through the client. The caller
 * must be a member of the library's workspace and able to manage libraries in the
 * destination.
 *
 * The client picks the new library's id and each copy's id, as it does an added item's, so it
 * can list the copy under those ids while this runs. The items copied are the ones `itemIds`
 * names, in the library's order: one deleted meanwhile, or whose content is missing, is left
 * out. Ids that are taken are refused with 409 before anything is stored; if another request takes
 * one meanwhile, the inserts find it and this answers 409 and removes what it stored. Items are
 * copied a few at a time, and the rows are inserted together, so a failure leaves nothing behind.
 */
export async function copyLibrary(request: IRequest, env: Environment) {
	const auth = await requireAuth(request, env)
	const libraryId = request.params.libraryId
	const body = readBody(await request.json().catch(() => null))
	if (!libraryId || !body) return badRequest('Bad request')
	const { owningGroupId, id, itemIds } = body

	const db = createPostgresConnectionPool(env, 'copyLibrary')
	try {
		const access = await getLibraryAccess(db, auth.userId, libraryId)
		if (!access || !isRole(access.role)) {
			return Response.json({ error: 'Not found' }, { status: 404 })
		}
		if (!can(await getWorkspaceRole(db, auth.userId, owningGroupId), 'manageLibraries')) {
			return Response.json({ error: 'Forbidden' }, { status: 403 })
		}

		const items = await db
			.selectFrom('library_item')
			.selectAll()
			.where('libraryId', '=', libraryId)
			.orderBy('createdAt')
			.orderBy('id')
			.execute()
		const newIdsBySourceId = new Map(Object.entries(itemIds))
		const toCopy = items.flatMap((item) => {
			const newId = newIdsBySourceId.get(item.id)
			return newId ? [{ item, newId }] : []
		})
		if (
			(await isLibraryIdTaken(db, id)) ||
			(await isAnyItemIdTaken(
				db,
				env,
				toCopy.map((c) => c.newId)
			))
		) {
			return conflict()
		}

		const now = Date.now()
		const copied: CopiedObjects = { keys: [], uploads: [] }
		try {
			const copies = await copyEachItemsObjects(env, toCopy, copied)
			const rows: TlaLibraryItem[] = []
			const owned: TlaLibraryItemAsset[] = []
			copies.forEach((copy, index) => {
				if (!copy) return
				const newItemId = toCopy[index].newId
				rows.push({
					id: newItemId,
					libraryId: id,
					name: toCopy[index].item.name,
					thumbnail: toThumbnailColumn(copy.thumbnail),
					createdBy: auth.userId,
					// Items are listed by createdAt, so each copy's is a step later to keep their order.
					createdAt: now + rows.length,
					updatedAt: now,
				})
				for (const objectName of copy.ownedObjectNames) {
					owned.push({ itemId: newItemId, objectName })
				}
			})

			await db.transaction().execute(async (tx) => {
				const library = await tx
					.insertInto('library')
					.values({
						id,
						name: access.library.name,
						owningGroupId,
						createdBy: auth.userId,
						createdAt: now,
						updatedAt: now,
						meta: access.library.meta,
					})
					.onConflict((oc) => oc.column('id').doNothing())
					.returning('id')
					.executeTakeFirst()
				if (!library) throw new IdTakenError()
				if (rows.length > 0) {
					const inserted = await tx
						.insertInto('library_item')
						.values(rows)
						.onConflict((oc) => oc.column('id').doNothing())
						.returning('id')
						.execute()
					if (inserted.length < rows.length) {
						const insertedIds = new Set(inserted.map((row) => row.id))
						// Content stored under the other requests' ids is theirs now, so it stays.
						const takenKeys = new Set(
							rows
								.filter((row) => !insertedIds.has(row.id))
								.map((row) => getLibraryItemContentKey(row.id))
						)
						copied.keys = copied.keys.filter((key) => !takenKeys.has(key))
						throw new IdTakenError()
					}
				}
				if (owned.length > 0) await tx.insertInto('library_item_asset').values(owned).execute()
			})
		} catch (error) {
			if (copied.keys.length > 0) await env.ROOMS.delete(copied.keys)
			if (copied.uploads.length > 0) await env.UPLOADS.delete(copied.uploads)
			if (error instanceof IdTakenError) return conflict()
			throw error
		}
		return Response.json({ id } satisfies CopyLibraryResponseBody)
	} finally {
		await db.destroy()
	}
}

interface CopiedObjects {
	keys: string[]
	uploads: string[]
}

interface CopiedItem {
	thumbnail: Awaited<ReturnType<typeof copyThumbnail>>
	ownedObjectNames: string[]
}

/**
 * Copies each item's objects, a few at a time, in order; null for an item whose content is
 * missing. If one fails, the ones under way finish, so `copied` holds everything stored, and the
 * rest aren't started.
 */
async function copyEachItemsObjects(
	env: Environment,
	toCopy: { item: TlaLibraryItem; newId: string }[],
	copied: CopiedObjects
) {
	const queue = new PQueue({ concurrency: STORAGE_CONCURRENCY })
	try {
		return await queue.addAll(
			toCopy.map(
				({ item, newId }) =>
					() =>
						copyItemObjects(env, item, newId, copied)
			)
		)
	} catch (error) {
		queue.clear()
		await queue.onIdle()
		throw error
	}
}

/**
 * Copies an item's stored content to a new id, the copy owning its own copies of the uploads its
 * content refers to, and its thumbnail to new public uploads; null when its content is missing.
 */
async function copyItemObjects(
	env: Environment,
	item: TlaLibraryItem,
	newId: string,
	copied: CopiedObjects
): Promise<CopiedItem | null> {
	const stored = await env.ROOMS.get(getLibraryItemContentKey(item.id))
	if (!stored) return null
	const { content, ownedObjectNames } = await copyItemAssets(
		env,
		(await stored.json()) as StoredItemContent,
		newId
	)
	copied.uploads.push(...ownedObjectNames)
	const contentKey = getLibraryItemContentKey(newId)
	await env.ROOMS.put(contentKey, JSON.stringify(content), {
		httpMetadata: { contentType: 'application/json' },
	})
	copied.keys.push(contentKey)
	const thumbnail = await copyThumbnail(env, item.thumbnail, copied.uploads)
	return { thumbnail, ownedObjectNames }
}
