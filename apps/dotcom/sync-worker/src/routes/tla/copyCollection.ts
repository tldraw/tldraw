import { can, isRole, TlaCollectionItem } from '@tldraw/dotcom-shared'
import { uniqueId } from '@tldraw/utils'
import { IRequest } from 'itty-router'
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
 * stored objects made here rather than through the client. The caller must be a member of the
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
		const copiedKeys: string[] = []
		const rows: TlaCollectionItem[] = []
		try {
			for (const item of items) {
				const newItemId = uniqueId()
				const copy = await copyItemObjects(env, item, newItemId, copiedKeys)
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
			})
		} catch (error) {
			if (copiedKeys.length > 0) await env.ROOMS.delete(copiedKeys)
			throw error
		}
		return Response.json({ id } satisfies CopyCollectionResponseBody)
	} finally {
		await db.destroy()
	}
}

/** Copies an item's stored objects to a new id; null when its content is missing. */
async function copyItemObjects(
	env: Environment,
	item: TlaCollectionItem,
	newId: string,
	copiedKeys: string[]
) {
	const content = await env.ROOMS.get(getCollectionItemContentKey(item.id))
	if (!content) return null
	const contentKey = getCollectionItemContentKey(newId)
	await env.ROOMS.put(contentKey, await content.arrayBuffer(), {
		httpMetadata: { contentType: 'application/json' },
	})
	copiedKeys.push(contentKey)

	let thumbnailType = item.thumbnailType
	if (thumbnailType) {
		const thumbnail = await env.ROOMS.get(getCollectionItemThumbnailKey(item.id))
		if (thumbnail) {
			const thumbnailKey = getCollectionItemThumbnailKey(newId)
			await env.ROOMS.put(thumbnailKey, await thumbnail.arrayBuffer(), {
				httpMetadata: { contentType: thumbnailType },
			})
			copiedKeys.push(thumbnailKey)
		} else {
			thumbnailType = null
		}
	}
	return { thumbnailType }
}
