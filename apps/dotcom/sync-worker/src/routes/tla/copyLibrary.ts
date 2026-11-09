import { can, isRole, TlaLibraryItem, TlaLibraryItemAsset } from '@tldraw/dotcom-shared'
import { uniqueId } from '@tldraw/utils'
import { IRequest } from 'itty-router'
import { copyItemAssets, StoredItemContent } from '../../libraryItemAssets'
import { getLibraryAccess, getLibraryItemContentKey, getWorkspaceRole } from '../../libraryStorage'
import { copyThumbnail, toThumbnailColumn } from '../../libraryThumbnails'
import { createPostgresConnectionPool } from '../../postgres'
import { Environment } from '../../types'
import { requireAuth } from '../../utils/tla/getAuth'

export interface CopyLibraryRequestBody {
	owningGroupId: string
}

export interface CopyLibraryResponseBody {
	id: string
}

/**
 * Copies a library, with its items, into a workspace: new rows, and copies of each item's
 * content, thumbnail and the uploads it owns, made here rather than through the client. The caller must be a member of the
 * library's workspace and able to manage libraries in the destination. An item whose content
 * is missing is left out.
 */
export async function copyLibrary(request: IRequest, env: Environment) {
	const auth = await requireAuth(request, env)
	const libraryId = request.params.libraryId
	const body = (await request.json().catch(() => null)) as CopyLibraryRequestBody | null
	const owningGroupId = body?.owningGroupId
	if (!libraryId || typeof owningGroupId !== 'string' || !owningGroupId) {
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

		const items = await db
			.selectFrom('library_item')
			.selectAll()
			.where('libraryId', '=', libraryId)
			.orderBy('createdAt')
			.execute()

		const id = uniqueId()
		const now = Date.now()
		const copied: CopiedObjects = { keys: [], uploads: [] }
		const rows: TlaLibraryItem[] = []
		const owned: TlaLibraryItemAsset[] = []
		try {
			for (const item of items) {
				const newItemId = uniqueId()
				const copy = await copyItemObjects(env, item, newItemId, copied)
				if (!copy) continue
				rows.push({
					id: newItemId,
					libraryId: id,
					name: item.name,
					thumbnail: toThumbnailColumn(copy.thumbnail),
					createdBy: auth.userId,
					createdAt: now,
					updatedAt: now,
				})
				for (const objectName of copy.ownedObjectNames) {
					owned.push({ itemId: newItemId, objectName })
				}
			}
			await db.transaction().execute(async (tx) => {
				await tx
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
					.execute()
				if (rows.length > 0) await tx.insertInto('library_item').values(rows).execute()
				if (owned.length > 0) await tx.insertInto('library_item_asset').values(owned).execute()
			})
		} catch (error) {
			if (copied.keys.length > 0) await env.ROOMS.delete(copied.keys)
			if (copied.uploads.length > 0) await env.UPLOADS.delete(copied.uploads)
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

/**
 * Copies an item's stored content to a new id, the copy owning its own copies of the uploads its
 * content refers to, and its thumbnail to new public uploads; null when its content is missing.
 */
async function copyItemObjects(
	env: Environment,
	item: TlaLibraryItem,
	newId: string,
	copied: CopiedObjects
) {
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
