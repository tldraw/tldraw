import { can, isRole, TlaCollectionItem, TlaCollectionItemAsset } from '@tldraw/dotcom-shared'
import { uniqueId } from '@tldraw/utils'
import { IRequest } from 'itty-router'
import { copyItemAssets, StoredItemContent } from '../../collectionItemAssets'
import {
	getCollectionAccess,
	getCollectionItemContentKey,
	getCollectionItemThumbnailKey,
	getWorkspaceRole,
} from '../../collectionStorage'
import { createPostgresConnectionPool } from '../../postgres'
import { Environment } from '../../types'
import { requireAuth } from '../../utils/tla/getAuth'

export interface CopyCollectionRequestBody {
	owningGroupId: string
}

export interface CopyCollectionResponseBody {
	id: string
}

/**
 * Copies a collection, with its items, into a workspace: new rows, and copies of each item's
 * stored objects and of the uploads it owns, made here rather than through the client. The caller must be a member of the
 * collection's workspace and able to manage collections in the destination. An item whose content
 * is missing is left out.
 */
export async function copyCollection(request: IRequest, env: Environment) {
	const auth = await requireAuth(request, env)
	const collectionId = request.params.collectionId
	const body = (await request.json().catch(() => null)) as CopyCollectionRequestBody | null
	const owningGroupId = body?.owningGroupId
	if (!collectionId || typeof owningGroupId !== 'string' || !owningGroupId) {
		return Response.json({ error: 'Bad request' }, { status: 400 })
	}

	const db = createPostgresConnectionPool(env, 'copyCollection')
	try {
		const access = await getCollectionAccess(db, auth.userId, collectionId)
		if (!access || !isRole(access.role)) {
			return Response.json({ error: 'Not found' }, { status: 404 })
		}
		if (!can(await getWorkspaceRole(db, auth.userId, owningGroupId), 'manageCollections')) {
			return Response.json({ error: 'Forbidden' }, { status: 403 })
		}

		const items = await db
			.selectFrom('collection_item')
			.selectAll()
			.where('collectionId', '=', collectionId)
			.orderBy('createdAt')
			.execute()

		const id = uniqueId()
		const now = Date.now()
		const copied: CopiedObjects = { keys: [], uploads: [] }
		const rows: TlaCollectionItem[] = []
		const owned: TlaCollectionItemAsset[] = []
		try {
			for (const item of items) {
				const newItemId = uniqueId()
				const copy = await copyItemObjects(env, item, newItemId, copied)
				if (!copy) continue
				rows.push({
					id: newItemId,
					collectionId: id,
					name: item.name,
					thumbnailType: copy.thumbnailType,
					createdBy: auth.userId,
					createdAt: now,
					updatedAt: now,
				})
				for (const objectName of copy.ownedObjectNames)
					owned.push({ itemId: newItemId, objectName })
			}
			await db.transaction().execute(async (tx) => {
				await tx
					.insertInto('collection')
					.values({
						id,
						name: access.collection.name,
						owningGroupId,
						createdBy: auth.userId,
						createdAt: now,
						updatedAt: now,
						meta: access.collection.meta,
					})
					.execute()
				if (rows.length > 0) await tx.insertInto('collection_item').values(rows).execute()
				if (owned.length > 0) await tx.insertInto('collection_item_asset').values(owned).execute()
			})
		} catch (error) {
			if (copied.keys.length > 0) await env.ROOMS.delete(copied.keys)
			if (copied.uploads.length > 0) await env.UPLOADS.delete(copied.uploads)
			throw error
		}
		return Response.json({ id } satisfies CopyCollectionResponseBody)
	} finally {
		await db.destroy()
	}
}

interface CopiedObjects {
	keys: string[]
	uploads: string[]
}

/**
 * Copies an item's stored objects to a new id, the copy owning its own copies of the uploads its
 * content refers to; null when its content is missing.
 */
async function copyItemObjects(
	env: Environment,
	item: TlaCollectionItem,
	newId: string,
	copied: CopiedObjects
) {
	const stored = await env.ROOMS.get(getCollectionItemContentKey(item.id))
	if (!stored) return null
	const { content, ownedObjectNames } = await copyItemAssets(
		env,
		(await stored.json()) as StoredItemContent,
		newId
	)
	copied.uploads.push(...ownedObjectNames)
	const contentKey = getCollectionItemContentKey(newId)
	await env.ROOMS.put(contentKey, JSON.stringify(content), {
		httpMetadata: { contentType: 'application/json' },
	})
	copied.keys.push(contentKey)

	let thumbnailType = item.thumbnailType
	if (thumbnailType) {
		const thumbnail = await env.ROOMS.get(getCollectionItemThumbnailKey(item.id))
		if (thumbnail) {
			const thumbnailKey = getCollectionItemThumbnailKey(newId)
			await env.ROOMS.put(thumbnailKey, await thumbnail.arrayBuffer(), {
				httpMetadata: { contentType: thumbnailType },
			})
			copied.keys.push(thumbnailKey)
		} else {
			thumbnailType = null
		}
	}
	return { thumbnailType, ownedObjectNames }
}
