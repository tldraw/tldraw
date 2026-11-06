import { can, isRole, MAX_COLLECTION_NAME_LENGTH } from '@tldraw/dotcom-shared'
import { uniqueId } from '@tldraw/utils'
import { IRequest } from 'itty-router'
import { copyItemAssets, StoredItemContent } from '../../collectionItemAssets'
import {
	COLLECTION_ITEM_THUMBNAIL_TYPES,
	getCollectionAccess,
	getCollectionItemAccess,
	getCollectionItemContentKey,
	getCollectionItemThumbnailKey,
	MAX_COLLECTION_ITEM_CONTENT_BYTES,
	MAX_COLLECTION_ITEM_THUMBNAIL_BYTES,
} from '../../collectionStorage'
import { createPostgresConnectionPool } from '../../postgres'
import { Environment } from '../../types'
import { requireAuth } from '../../utils/tla/getAuth'

export interface AddCollectionItemResponseBody {
	id: string
	createdAt: number
}

// Callers who aren't members of the workspace get the same answer as for an id that doesn't
// exist, so ids can't be probed.
const notFound = () => Response.json({ error: 'Not found' }, { status: 404 })
const badRequest = (error: string) => Response.json({ error }, { status: 400 })

async function readText(value: FormDataEntryValue | null) {
	if (value === null) return null
	return typeof value === 'string' ? value : await value.text()
}

function isItemContent(value: unknown): value is StoredItemContent {
	if (!value || typeof value !== 'object') return false
	const { formatVersion, content } = value as { formatVersion?: unknown; content?: any }
	if (formatVersion !== 1 || !content || typeof content !== 'object') return false
	return content.assets === undefined || Array.isArray(content.assets)
}

/**
 * Adds an item to a collection: gives it its own copies of the uploads its content refers to (see
 * copyItemAssets), stores its content (a TLCollectionItemContent as JSON) and optional thumbnail,
 * then inserts its row, which reaches clients through Zero, and records the copies it owns. The worker picks
 * the item's id, so a request can't name an existing item and overwrite its content.
 *
 * Form fields: `content`, `thumbnail` (optional, PNG, WebP or JPEG), `name` (optional).
 */
export async function addCollectionItem(request: IRequest, env: Environment) {
	const auth = await requireAuth(request, env)
	const collectionId = request.params.collectionId
	if (!collectionId) return badRequest('Collection id is required')

	const form = await request.formData().catch(() => null)
	if (!form) return badRequest('Expected form data')
	const contentText = await readText(form.get('content'))
	if (contentText === null) return badRequest('Content is required')
	if (new TextEncoder().encode(contentText).byteLength > MAX_COLLECTION_ITEM_CONTENT_BYTES) {
		return Response.json({ error: 'Content is too large' }, { status: 413 })
	}
	let content: unknown
	try {
		content = JSON.parse(contentText)
	} catch {
		return badRequest('Content must be JSON')
	}
	if (!isItemContent(content)) return badRequest('Content must be collection item content')

	const thumbnail = form.get('thumbnail')
	if (thumbnail !== null && typeof thumbnail !== 'string') {
		if (!COLLECTION_ITEM_THUMBNAIL_TYPES.has(thumbnail.type)) {
			return badRequest('Thumbnail must be PNG, WebP or JPEG')
		}
		if (thumbnail.size > MAX_COLLECTION_ITEM_THUMBNAIL_BYTES) {
			return Response.json({ error: 'Thumbnail is too large' }, { status: 413 })
		}
	}
	const thumbnailFile = thumbnail !== null && typeof thumbnail !== 'string' ? thumbnail : null
	const name =
		(await readText(form.get('name')))?.trim().slice(0, MAX_COLLECTION_NAME_LENGTH) || null

	const db = createPostgresConnectionPool(env, 'addCollectionItem')
	try {
		const access = await getCollectionAccess(db, auth.userId, collectionId)
		if (!access || !isRole(access.role)) return notFound()
		if (!can(access.role, 'manageCollections')) {
			return Response.json({ error: 'Forbidden' }, { status: 403 })
		}

		const id = uniqueId()
		const now = Date.now()
		const keys: string[] = []
		let ownedObjectNames: string[] = []
		try {
			const owned = await copyItemAssets(env, content, id)
			ownedObjectNames = owned.ownedObjectNames
			keys.push(getCollectionItemContentKey(id))
			await env.ROOMS.put(keys[0], JSON.stringify(owned.content), {
				httpMetadata: { contentType: 'application/json' },
			})
			if (thumbnailFile) {
				keys.push(getCollectionItemThumbnailKey(id))
				await env.ROOMS.put(keys[1], await thumbnailFile.arrayBuffer(), {
					httpMetadata: { contentType: thumbnailFile.type },
				})
			}
			await db.transaction().execute(async (tx) => {
				await tx
					.insertInto('collection_item')
					.values({
						id,
						collectionId,
						name,
						thumbnailType: thumbnailFile?.type ?? null,
						createdBy: auth.userId,
						createdAt: now,
						updatedAt: now,
					})
					.execute()
				if (ownedObjectNames.length > 0) {
					await tx
						.insertInto('collection_item_asset')
						.values(ownedObjectNames.map((objectName) => ({ itemId: id, objectName })))
						.execute()
				}
			})
		} catch (error) {
			// e.g. the collection was deleted meanwhile; nothing refers to the objects yet
			if (keys.length > 0) await env.ROOMS.delete(keys)
			if (ownedObjectNames.length > 0) await env.UPLOADS.delete(ownedObjectNames)
			throw error
		}
		return Response.json({ id, createdAt: now } satisfies AddCollectionItemResponseBody)
	} finally {
		await db.destroy()
	}
}

async function getItemObject(request: IRequest, env: Environment, part: 'content' | 'thumbnail') {
	const auth = await requireAuth(request, env)
	const itemId = request.params.itemId
	if (!itemId) return badRequest('Item id is required')

	const db = createPostgresConnectionPool(env, 'getCollectionItem')
	let contentType: string
	try {
		const access = await getCollectionItemAccess(db, auth.userId, itemId)
		if (!access || !isRole(access.role)) return notFound()
		if (part === 'thumbnail') {
			if (!access.item.thumbnailType) return notFound()
			contentType = access.item.thumbnailType
		} else {
			contentType = 'application/json'
		}
	} finally {
		await db.destroy()
	}

	const key =
		part === 'content' ? getCollectionItemContentKey(itemId) : getCollectionItemThumbnailKey(itemId)
	const object = await env.ROOMS.get(key)
	if (!object) return notFound()
	// Items are never edited, so what's stored under an id doesn't change.
	return new Response(object.body, {
		headers: {
			'content-type': contentType,
			'cache-control': 'private, max-age=31536000, immutable',
		},
	})
}

/** An item's content, to members of its collection's workspace. */
export function getCollectionItemContent(request: IRequest, env: Environment) {
	return getItemObject(request, env, 'content')
}

/** An item's thumbnail, to members of its collection's workspace. */
export function getCollectionItemThumbnail(request: IRequest, env: Environment) {
	return getItemObject(request, env, 'thumbnail')
}
