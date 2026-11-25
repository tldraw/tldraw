import {
	can,
	isRole,
	libraryName,
	MAX_NUMBER_OF_LIBRARIES,
	MAX_NUMBER_OF_LIBRARY_ITEMS,
	TlaLibraryItemObject,
	ZErrorCode,
} from '@tldraw/dotcom-shared'
import { IRequest } from 'itty-router'
import {
	countWorkspaceLibraries,
	getLibraryAccess,
	getWorkspaceRole,
	isClientPickedId,
	limitReached,
} from '../../libraryStorage'
import { LibraryItemInsertRow, toThumbnailColumn } from '../../libraryThumbnails'
import { createPostgresConnectionPool } from '../../postgres'
import { Environment } from '../../types'
import { canUseLibraries } from '../../utils/featureFlags'
import { requireAuth } from '../../utils/tla/getAuth'

export interface CopyLibraryRequestBody {
	owningGroupId: string
	/** The new library's id, made by uniqueId. */
	id: string
	/** The new library's name. Left out, it has the library's. */
	name?: string
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
	const { owningGroupId, id, name, itemIds } = body as Partial<CopyLibraryRequestBody>
	if (typeof owningGroupId !== 'string' || !owningGroupId || !isClientPickedId(id)) return null
	if (name !== undefined && (typeof name !== 'string' || name.trim() === '')) return null
	if (!itemIds || typeof itemIds !== 'object' || Array.isArray(itemIds)) return null
	const newIds = Object.values(itemIds)
	if (!newIds.every(isClientPickedId) || new Set(newIds).size !== newIds.length) return null
	return { owningGroupId, id, name, itemIds }
}

/**
 * Copies a library, with its items, into a workspace. The copy's items share the R2 objects of
 * the items they were copied from (content, thumbnails and the uploads they own): this inserts
 * rows only, a library_item_object row for each object a copied item uses, and an object is
 * deleted once no item uses it. The caller must be a member of the library's workspace and able to
 * manage libraries in the destination. The copy counts toward the destination's
 * MAX_NUMBER_OF_LIBRARIES, and its items toward its own MAX_NUMBER_OF_LIBRARY_ITEMS; past either,
 * copying answers 409 and writes nothing.
 *
 * The client picks the new library's id and each copy's id, as it does an added item's, so it
 * can list the copy under those ids while this runs. The items copied are the ones `itemIds`
 * names, in the library's order: one deleted meanwhile is left out. If an id is taken, the inserts
 * find it and this answers 409; the rows are inserted in one transaction, so nothing is left behind.
 */
export async function copyLibrary(request: IRequest, env: Environment) {
	const auth = await requireAuth(request, env)
	if (!(await canUseLibraries(env, auth.userId))) {
		return Response.json({ error: 'Not found' }, { status: 404 })
	}
	const libraryId = request.params.libraryId
	const body = readBody(await request.json().catch(() => null))
	if (!libraryId || !body) return badRequest('Bad request')
	const { owningGroupId, id, name, itemIds } = body
	if (Object.keys(itemIds).length > MAX_NUMBER_OF_LIBRARY_ITEMS) {
		return limitReached(ZErrorCode.max_library_items_reached)
	}

	const db = createPostgresConnectionPool(env, 'copyLibrary')
	try {
		const access = await getLibraryAccess(db, auth.userId, libraryId)
		if (!access || !isRole(access.role)) {
			return Response.json({ error: 'Not found' }, { status: 404 })
		}
		if (!can(await getWorkspaceRole(db, auth.userId, owningGroupId), 'manageLibraries')) {
			return Response.json({ error: 'Forbidden' }, { status: 403 })
		}

		// Dropped so the copy isn't taken for an untouched starter pack copy, which is deleted once it
		// leaves its last file.
		const { packId: _packId, ...meta } = access.library.meta
		const now = Date.now()
		let refused: typeof ZErrorCode.max_libraries_reached | undefined
		try {
			refused = await db.transaction().execute(async (tx) => {
				if (
					(await countWorkspaceLibraries(tx, owningGroupId, { lock: true })) >=
					MAX_NUMBER_OF_LIBRARIES
				) {
					return ZErrorCode.max_libraries_reached
				}
				// Locked so a delete of a source item waits for the copy, and can't remove an object
				// before the copy's rows name it.
				const items = await tx
					.selectFrom('library_item')
					.selectAll()
					.where('libraryId', '=', libraryId)
					.orderBy('createdAt')
					.orderBy('id')
					.forKeyShare()
					.execute()
				const library = await tx
					.insertInto('library')
					.values({
						id,
						name: name === undefined ? access.library.name : libraryName(name),
						owningGroupId,
						createdBy: auth.userId,
						createdAt: now,
						updatedAt: now,
						meta,
						isDefault: false,
						fileCount: 0,
					})
					.onConflict((oc) => oc.column('id').doNothing())
					.returning('id')
					.executeTakeFirst()
				if (!library) throw new IdTakenError()

				const requested = new Map(Object.entries(itemIds))
				const toCopy = items.flatMap((item) => {
					const newId = requested.get(item.id)
					return newId ? [{ item, newId }] : []
				})
				if (toCopy.length === 0) return undefined
				const rows: LibraryItemInsertRow[] = toCopy.map(({ item, newId }, index) => ({
					id: newId,
					libraryId: id,
					name: item.name,
					thumbnail: toThumbnailColumn(item.thumbnail),
					contentKey: item.contentKey,
					createdBy: auth.userId,
					// Items are listed by createdAt, so each copy's is a step later to keep their order.
					createdAt: now + index,
					updatedAt: now,
					meta: item.meta,
				}))
				const inserted = await tx
					.insertInto('library_item')
					.values(rows)
					.onConflict((oc) => oc.column('id').doNothing())
					.returning('id')
					.execute()
				if (inserted.length < rows.length) throw new IdTakenError()

				const newIdsBySourceId = new Map(toCopy.map(({ item, newId }) => [item.id, newId]))
				const sourceObjects = await tx
					.selectFrom('library_item_object')
					.selectAll()
					.where('itemId', 'in', [...newIdsBySourceId.keys()])
					.execute()
				const objects: TlaLibraryItemObject[] = sourceObjects.map((object) => ({
					...object,
					itemId: newIdsBySourceId.get(object.itemId)!,
				}))
				if (objects.length > 0) {
					await tx.insertInto('library_item_object').values(objects).execute()
				}
				return undefined
			})
		} catch (error) {
			if (error instanceof IdTakenError) return conflict()
			throw error
		}
		if (refused) return limitReached(refused)
		return Response.json({ id } satisfies CopyLibraryResponseBody)
	} finally {
		await db.destroy()
	}
}
