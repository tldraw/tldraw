import {
	can,
	isRole,
	libraryName,
	MAX_NUMBER_OF_LIBRARIES,
	MAX_NUMBER_OF_LIBRARY_ITEMS,
	TlaLibraryItemObject,
	ZErrorCode,
} from '@tldraw/dotcom-shared'
import { uniqueId } from '@tldraw/utils'
import { IRequest } from 'itty-router'
import {
	countWorkspaceLibraries,
	getLibraryAccess,
	getWorkspaceRole,
	limitReached,
} from '../../libraryStorage'
import { LibraryItemInsertRow, toThumbnailColumn } from '../../libraryThumbnails'
import { createPostgresConnectionPool } from '../../postgres'
import { Environment } from '../../types'
import { canUseLibraries } from '../../utils/featureFlags'
import { requireAuth } from '../../utils/tla/getAuth'

export interface CopyLibraryRequestBody {
	owningGroupId: string
	/** The new library's name. Left out, it has the library's. */
	name?: string
}

export interface CopyLibraryResponseBody {
	id: string
}

/**
 * Copies a library, with its items, into a workspace. The copy's items share the R2 objects of
 * the items they were copied from (content, thumbnails and the uploads they own): this inserts
 * rows only, a library_item_object row for each object a copied item uses, and an object is
 * deleted once no item uses it. The caller must be a member of the library's workspace and able to
 * manage libraries in the destination. The copy counts toward the destination's
 * MAX_NUMBER_OF_LIBRARIES, and its items toward its own MAX_NUMBER_OF_LIBRARY_ITEMS; past either,
 * copying answers 409 and writes nothing.
 */
export async function copyLibrary(request: IRequest, env: Environment) {
	const auth = await requireAuth(request, env)
	if (!(await canUseLibraries(env, auth.userId))) {
		return Response.json({ error: 'Not found' }, { status: 404 })
	}
	const libraryId = request.params.libraryId
	const body = (await request.json().catch(() => null)) as CopyLibraryRequestBody | null
	const owningGroupId = body?.owningGroupId
	const name = body?.name
	if (!libraryId || typeof owningGroupId !== 'string' || !owningGroupId) {
		return Response.json({ error: 'Bad request' }, { status: 400 })
	}
	if (name !== undefined && (typeof name !== 'string' || name.trim() === '')) {
		return Response.json({ error: 'Bad request' }, { status: 400 })
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

		const id = uniqueId()
		const now = Date.now()
		const refused = await db.transaction().execute(async (tx) => {
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
				.forKeyShare()
				.execute()
			if (items.length > MAX_NUMBER_OF_LIBRARY_ITEMS) return ZErrorCode.max_library_items_reached
			await tx
				.insertInto('library')
				.values({
					id,
					name: name === undefined ? access.library.name : libraryName(name),
					owningGroupId,
					createdBy: auth.userId,
					createdAt: now,
					updatedAt: now,
					meta: access.library.meta,
				})
				.execute()
			if (items.length === 0) return null

			const newIdsBySourceId = new Map(items.map((item) => [item.id, uniqueId()]))
			const rows: LibraryItemInsertRow[] = items.map((item) => ({
				id: newIdsBySourceId.get(item.id)!,
				libraryId: id,
				name: item.name,
				thumbnail: toThumbnailColumn(item.thumbnail),
				contentKey: item.contentKey,
				createdBy: auth.userId,
				createdAt: now,
				updatedAt: now,
			}))
			await tx.insertInto('library_item').values(rows).execute()

			const sourceObjects = await tx
				.selectFrom('library_item_object')
				.selectAll()
				.where('itemId', 'in', [...newIdsBySourceId.keys()])
				.execute()
			const objects: TlaLibraryItemObject[] = sourceObjects.map((object) => ({
				...object,
				itemId: newIdsBySourceId.get(object.itemId)!,
			}))
			if (objects.length > 0) await tx.insertInto('library_item_object').values(objects).execute()
			return null
		})
		if (refused) return limitReached(refused)
		return Response.json({ id } satisfies CopyLibraryResponseBody)
	} finally {
		await db.destroy()
	}
}
