import {
	can,
	isRole,
	MAX_LIBRARY_NAME_LENGTH,
	MAX_NUMBER_OF_LIBRARY_ITEMS,
	TlaLibraryItemThumbnail,
	ZErrorCode,
} from '@tldraw/dotcom-shared'
import { uniqueId } from '@tldraw/utils'
import { IRequest } from 'itty-router'
import { AssetToReplace } from '../../assetAssociation'
import { LibraryItemObject, queueLibraryObjectDeletes } from '../../libraryEffects'
import { copyItemAssets, planItemAssetCopies, StoredItemContent } from '../../libraryItemAssets'
import {
	countLibraryItems,
	getLibraryAccess,
	getLibraryItemAccess,
	limitReached,
	MAX_LIBRARY_ITEM_CONTENT_BYTES,
	newLibraryItemContentKey,
} from '../../libraryStorage'
import {
	LIBRARY_ITEM_THUMBNAIL_TYPES,
	MAX_LIBRARY_ITEM_THUMBNAIL_BYTES,
	nameThumbnailUpload,
	putThumbnail,
	ThumbnailUpload,
	toThumbnailColumn,
} from '../../libraryThumbnails'
import { createPostgresConnectionPool } from '../../postgres'
import { Environment } from '../../types'
import { canUseLibraries } from '../../utils/featureFlags'
import { requireAuth } from '../../utils/tla/getAuth'

export interface AddLibraryItemResponseBody {
	id: string
	createdAt: number
	thumbnail: TlaLibraryItemThumbnail | null
}

// Callers who aren't members of the workspace get the same answer as for an id that doesn't
// exist, so ids can't be probed.
const notFound = () => Response.json({ error: 'Not found' }, { status: 404 })
const badRequest = (error: string) => Response.json({ error }, { status: 400 })

async function readText(value: FormDataEntryValue | null) {
	if (value === null) return null
	return typeof value === 'string' ? value : await value.text()
}

// A thumbnail field: null when it's left out, or the response refusing it.
function readThumbnail(value: FormDataEntryValue | null): File | null | Response {
	if (value === null || typeof value === 'string') return null
	if (!LIBRARY_ITEM_THUMBNAIL_TYPES.has(value.type)) {
		return badRequest('Thumbnail must be PNG, WebP, JPEG or SVG')
	}
	if (value.size > MAX_LIBRARY_ITEM_THUMBNAIL_BYTES) {
		return Response.json({ error: 'Thumbnail is too large' }, { status: 413 })
	}
	return value
}

function isItemContent(value: unknown): value is StoredItemContent {
	if (!value || typeof value !== 'object') return false
	const { formatVersion, content } = value as { formatVersion?: unknown; content?: any }
	if (formatVersion !== 1 || !content || typeof content !== 'object') return false
	if (content.assets === undefined) return true
	return (
		Array.isArray(content.assets) &&
		content.assets.every((asset: unknown) => !!asset && typeof asset === 'object')
	)
}

/**
 * Adds an item to a library: gives it its own copies of the uploads its content refers to (see
 * planItemAssetCopies), stores its content (a TLLibraryItemContent as JSON) privately and its
 * optional thumbnails as public uploads, then inserts its row, with the thumbnails' URLs, which
 * reaches clients through Zero, and a library_item_object row for each object it stored. Each
 * object is queued for deletion before it's stored (see queueLibraryObjectDeletes), so a failed or
 * stopped request leaves nothing behind once the processor has drained it. The worker picks the
 * item's id and every object's name, so a request can't name existing content and overwrite it. A
 * library holds at most MAX_NUMBER_OF_LIBRARY_ITEMS items; past that, adding answers 409.
 *
 * Form fields: `content`, `thumbnail` (optional, PNG, WebP, JPEG or SVG), `darkThumbnail` (optional, and
 * only with `thumbnail`, which is then the light one of the pair) and `name` (optional).
 */
export async function addLibraryItem(request: IRequest, env: Environment) {
	const auth = await requireAuth(request, env)
	if (!(await canUseLibraries(env, auth.userId))) return notFound()
	const libraryId = request.params.libraryId
	if (!libraryId) return badRequest('Library id is required')

	const form = await request.formData().catch(() => null)
	if (!form) return badRequest('Expected form data')
	const contentText = await readText(form.get('content'))
	if (contentText === null) return badRequest('Content is required')
	if (new TextEncoder().encode(contentText).byteLength > MAX_LIBRARY_ITEM_CONTENT_BYTES) {
		return Response.json({ error: 'Content is too large' }, { status: 413 })
	}
	let content: unknown
	try {
		content = JSON.parse(contentText)
	} catch {
		return badRequest('Content must be JSON')
	}
	if (!isItemContent(content)) return badRequest('Content must be library item content')

	const thumbnailFile = readThumbnail(form.get('thumbnail'))
	if (thumbnailFile instanceof Response) return thumbnailFile
	const darkThumbnailFile = readThumbnail(form.get('darkThumbnail'))
	if (darkThumbnailFile instanceof Response) return darkThumbnailFile
	if (darkThumbnailFile && !thumbnailFile) return badRequest('A dark thumbnail needs a light one')
	const name = (await readText(form.get('name')))?.trim().slice(0, MAX_LIBRARY_NAME_LENGTH) || null

	const db = createPostgresConnectionPool(env, 'addLibraryItem')
	try {
		const access = await getLibraryAccess(db, auth.userId, libraryId)
		if (!access || !isRole(access.role)) return notFound()
		if (!can(access.role, 'manageLibraries')) {
			return Response.json({ error: 'Forbidden' }, { status: 403 })
		}
		// Checked before anything is stored, and again under the library's lock before the row is
		// inserted, in case another add filled it meanwhile.
		if ((await countLibraryItems(db, libraryId)) >= MAX_NUMBER_OF_LIBRARY_ITEMS) {
			return limitReached(ZErrorCode.max_library_items_reached)
		}

		const id = uniqueId()
		const contentKey = newLibraryItemContentKey()
		const assetCopies = planItemAssetCopies(env, content, id)
		const lightThumbnail = thumbnailFile && nameThumbnailUpload(thumbnailFile)
		const darkThumbnail = darkThumbnailFile && nameThumbnailUpload(darkThumbnailFile)
		const objects = itemObjects(contentKey, assetCopies, [lightThumbnail, darkThumbnail])
		// Queued before anything is stored, so what this stores is deleted if it fails or is stopped
		// before the rows below name it.
		await queueLibraryObjectDeletes(db, objects)

		const copied = await copyItemAssets(env, content, assetCopies)
		await env.ROOMS.put(contentKey, JSON.stringify(copied.content), {
			httpMetadata: { contentType: 'application/json' },
		})
		const thumbnail = lightThumbnail && (await putThumbnail(env, lightThumbnail, darkThumbnail))
		const skipped = new Set(copied.skippedObjectNames)
		const storedObjects = objects.filter((object) => !skipped.has(object.objectName))
		const now = Date.now()
		const added = await db.transaction().execute(async (tx) => {
			if ((await countLibraryItems(tx, libraryId, { lock: true })) >= MAX_NUMBER_OF_LIBRARY_ITEMS) {
				return false
			}
			await tx
				.insertInto('library_item')
				.values({
					id,
					libraryId,
					name,
					thumbnail: toThumbnailColumn(thumbnail),
					contentKey,
					createdBy: auth.userId,
					createdAt: now,
					updatedAt: now,
				})
				.execute()
			await tx
				.insertInto('library_item_object')
				.values(storedObjects.map((object) => ({ itemId: id, ...object })))
				.execute()
			return true
		})
		if (!added) return limitReached(ZErrorCode.max_library_items_reached)
		return Response.json({
			id,
			createdAt: now,
			thumbnail,
		} satisfies AddLibraryItemResponseBody)
	} finally {
		await db.destroy()
	}
}

// Every object an item stores, named before any is stored: what's queued for deletion, and, less
// any copy copyItemAssets skips, what the item's rows name.
function itemObjects(
	contentKey: string,
	assetCopies: AssetToReplace[],
	thumbnails: (ThumbnailUpload | null)[]
): LibraryItemObject[] {
	const uploads = [
		...assetCopies.map((copy) => copy.newObjectName),
		...thumbnails.flatMap((upload) => (upload ? [upload.objectName] : [])),
	]
	return [
		{ bucket: 'rooms', objectName: contentKey },
		...uploads.map((objectName) => ({ bucket: 'uploads' as const, objectName })),
	]
}

/** An item's content, to members of its library's workspace. */
export async function getLibraryItemContent(request: IRequest, env: Environment) {
	const auth = await requireAuth(request, env)
	if (!(await canUseLibraries(env, auth.userId))) return notFound()
	const itemId = request.params.itemId
	if (!itemId) return badRequest('Item id is required')

	const db = createPostgresConnectionPool(env, 'getLibraryItem')
	let contentKey: string
	try {
		const access = await getLibraryItemAccess(db, auth.userId, itemId)
		if (!access || !isRole(access.role)) return notFound()
		contentKey = access.item.contentKey
	} finally {
		await db.destroy()
	}

	const object = await env.ROOMS.get(contentKey)
	if (!object) return notFound()
	// Items' content is never edited, so what an id serves doesn't change.
	return new Response(object.body, {
		headers: {
			'content-type': 'application/json',
			'cache-control': 'private, max-age=31536000, immutable',
		},
	})
}
