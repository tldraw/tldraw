import {
	can,
	isRole,
	MAX_LIBRARY_ITEMS_PER_REQUEST,
	MAX_LIBRARY_ITEMS_REQUEST_BYTES,
	MAX_LIBRARY_NAME_LENGTH,
	TlaLibraryItem,
	TlaLibraryItemAsset,
	TlaLibraryItemThumbnail,
} from '@tldraw/dotcom-shared'
import { IRequest } from 'itty-router'
import { copyItemAssets, StoredItemContent } from '../../libraryItemAssets'
import {
	getLibraryAccess,
	getLibraryItemAccess,
	getLibraryItemContentKey,
	isAnyItemIdTaken,
	isClientPickedId,
	MAX_LIBRARY_ITEM_CONTENT_BYTES,
	runStorageTasks,
} from '../../libraryStorage'
import {
	LIBRARY_ITEM_THUMBNAIL_TYPES,
	MAX_LIBRARY_ITEM_THUMBNAIL_BYTES,
	putThumbnail,
	toThumbnailColumn,
} from '../../libraryThumbnails'
import { createPostgresConnectionPool } from '../../postgres'
import { Environment } from '../../types'
import { requireAuth } from '../../utils/tla/getAuth'

export interface AddLibraryItemsResponseBody {
	/** The items added, in the order the request listed them. */
	items: {
		id: string
		createdAt: number
		thumbnail: TlaLibraryItemThumbnail | null
	}[]
}

// Room for the form's field names, boundaries and list of items, on top of their content and
// thumbnails.
const FORM_OVERHEAD_BYTES = 1_000_000

// Callers who aren't members of the workspace get the same answer as for an id that doesn't
// exist, so ids can't be probed.
const notFound = () => Response.json({ error: 'Not found' }, { status: 404 })
const badRequest = (error: string) => Response.json({ error }, { status: 400 })
const tooLarge = (error: string) => Response.json({ error }, { status: 413 })
const conflict = () => Response.json({ error: 'An item id is taken' }, { status: 409 })

class IdTakenError extends Error {}

async function readText(value: FormDataEntryValue | null) {
	if (value === null) return null
	return typeof value === 'string' ? value : await value.text()
}

// A thumbnail field: null when it's left out, or the response refusing it.
function readThumbnail(value: FormDataEntryValue | null): File | null | Response {
	if (value === null || typeof value === 'string') return null
	if (!LIBRARY_ITEM_THUMBNAIL_TYPES.has(value.type)) {
		return badRequest('Thumbnail must be PNG, WebP or JPEG')
	}
	if (value.size > MAX_LIBRARY_ITEM_THUMBNAIL_BYTES) return tooLarge('Thumbnail is too large')
	return value
}

function isItemContent(value: unknown): value is StoredItemContent {
	if (!value || typeof value !== 'object') return false
	const { formatVersion, content } = value as { formatVersion?: unknown; content?: any }
	if (formatVersion !== 1 || !content || typeof content !== 'object') return false
	return content.assets === undefined || Array.isArray(content.assets)
}

function parseJson(text: string): { value: unknown } | null {
	try {
		return { value: JSON.parse(text) }
	} catch {
		return null
	}
}

interface NewItem {
	id: string
	name: string | null
	content: StoredItemContent
	thumbnail: File | null
	darkThumbnail: File | null
}

// The items the form lists, in its order, or the response refusing them.
async function readItems(form: FormData): Promise<NewItem[] | Response> {
	const listText = await readText(form.get('items'))
	const listed = listText === null ? null : parseJson(listText)
	if (!listed || !Array.isArray(listed.value) || listed.value.length === 0) {
		return badRequest('A list of items is required')
	}
	if (listed.value.length > MAX_LIBRARY_ITEMS_PER_REQUEST) return tooLarge('Too many items')

	const items: NewItem[] = []
	let bytes = 0
	for (const entry of listed.value as unknown[]) {
		const { id, name } = (entry ?? {}) as { id?: unknown; name?: unknown }
		if (!isClientPickedId(id)) return badRequest('A valid item id is required')
		if (items.some((item) => item.id === id)) return badRequest('Item ids must differ')

		const contentText = await readText(form.get(`content:${id}`))
		if (contentText === null) return badRequest('Content is required')
		const contentBytes = new TextEncoder().encode(contentText).byteLength
		if (contentBytes > MAX_LIBRARY_ITEM_CONTENT_BYTES) return tooLarge('Content is too large')
		const content = parseJson(contentText)
		if (!content) return badRequest('Content must be JSON')
		if (!isItemContent(content.value)) return badRequest('Content must be library item content')

		const thumbnail = readThumbnail(form.get(`thumbnail:${id}`))
		if (thumbnail instanceof Response) return thumbnail
		const darkThumbnail = readThumbnail(form.get(`darkThumbnail:${id}`))
		if (darkThumbnail instanceof Response) return darkThumbnail
		if (darkThumbnail && !thumbnail) return badRequest('A dark thumbnail needs a light one')

		bytes += contentBytes + (thumbnail?.size ?? 0) + (darkThumbnail?.size ?? 0)
		if (bytes > MAX_LIBRARY_ITEMS_REQUEST_BYTES) return tooLarge('The items are too large')
		items.push({
			id,
			name: typeof name === 'string' ? name.trim().slice(0, MAX_LIBRARY_NAME_LENGTH) || null : null,
			content: content.value,
			thumbnail,
			darkThumbnail,
		})
	}
	return items
}

/**
 * Adds items to a library, in the order the request lists them: gives each its own copies of
 * the uploads its content refers to (see copyItemAssets), stores its content (a
 * TLLibraryItemContent as JSON) privately and its optional thumbnails as public uploads, then
 * inserts all their rows together, with the thumbnails' URLs, which reach clients through Zero,
 * and records the copies they own. Items are stored a few at a time; each row's createdAt is a
 * step later than the one before, since items are listed by it.
 *
 * The client picks each item's id, as it does a file's, so it can list the items under those ids
 * while this runs. Ids that are taken are refused with 409 before anything is stored, so a request
 * can't overwrite another item's content; if another request takes one meanwhile, the row insert
 * finds it and this answers 409. Any failure removes everything this stored, and no row is
 * inserted.
 *
 * Form fields: `items`, a JSON list of `{ id, name? }` with each id made by uniqueId; then for each
 * item, by its id, `content:<id>`, `thumbnail:<id>` (optional, PNG, WebP or JPEG) and
 * `darkThumbnail:<id>` (optional, and only with `thumbnail:<id>`, which is then the light one of
 * the pair). At most MAX_LIBRARY_ITEMS_PER_REQUEST items, of at most
 * MAX_LIBRARY_ITEMS_REQUEST_BYTES of content and thumbnails together.
 */
export async function addLibraryItems(request: IRequest, env: Environment) {
	const auth = await requireAuth(request, env)
	const libraryId = request.params.libraryId
	if (!libraryId) return badRequest('Library id is required')
	// Refused before the form is read, which holds all of it in memory.
	const length = Number(request.headers.get('content-length'))
	if (length > MAX_LIBRARY_ITEMS_REQUEST_BYTES + FORM_OVERHEAD_BYTES) {
		return tooLarge('The items are too large')
	}

	const form = await request.formData().catch(() => null)
	if (!form) return badRequest('Expected form data')
	const items = await readItems(form)
	if (items instanceof Response) return items

	const db = createPostgresConnectionPool(env, 'addLibraryItems')
	try {
		const access = await getLibraryAccess(db, auth.userId, libraryId)
		if (!access || !isRole(access.role)) return notFound()
		if (!can(access.role, 'manageLibraries')) {
			return Response.json({ error: 'Forbidden' }, { status: 403 })
		}

		if (
			await isAnyItemIdTaken(
				db,
				env,
				items.map((item) => item.id)
			)
		) {
			return conflict()
		}

		const now = Date.now()
		const stored: StoredObjects = { keys: [], uploads: [] }
		try {
			const storedItems = await runStorageTasks(
				items.map((item) => () => storeItemObjects(env, item, stored))
			)
			const rows: TlaLibraryItem[] = items.map((item, index) => ({
				id: item.id,
				libraryId,
				name: item.name,
				thumbnail: toThumbnailColumn(storedItems[index].thumbnail),
				createdBy: auth.userId,
				createdAt: now + index,
				updatedAt: now,
			}))
			const owned: TlaLibraryItemAsset[] = items.flatMap((item, index) =>
				storedItems[index].ownedObjectNames.map((objectName) => ({ itemId: item.id, objectName }))
			)

			await db.transaction().execute(async (tx) => {
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
					stored.keys = stored.keys.filter((key) => !takenKeys.has(key))
					throw new IdTakenError()
				}
				if (owned.length > 0) await tx.insertInto('library_item_asset').values(owned).execute()
			})

			return Response.json({
				items: rows.map((row, index) => ({
					id: row.id,
					createdAt: row.createdAt,
					thumbnail: storedItems[index].thumbnail,
				})),
			} satisfies AddLibraryItemsResponseBody)
		} catch (error) {
			// e.g. the library was deleted meanwhile; nothing refers to the objects yet
			if (stored.keys.length > 0) await env.ROOMS.delete(stored.keys)
			if (stored.uploads.length > 0) await env.UPLOADS.delete(stored.uploads)
			if (error instanceof IdTakenError) return conflict()
			throw error
		}
	} finally {
		await db.destroy()
	}
}

interface StoredObjects {
	keys: string[]
	uploads: string[]
}

/**
 * Stores an item's content, with its own copies of the uploads it refers to, and its thumbnails.
 * What it stores is added to `stored` as it goes.
 */
async function storeItemObjects(env: Environment, item: NewItem, stored: StoredObjects) {
	const { content, ownedObjectNames } = await copyItemAssets(env, item.content, item.id)
	stored.uploads.push(...ownedObjectNames)
	const contentKey = getLibraryItemContentKey(item.id)
	await env.ROOMS.put(contentKey, JSON.stringify(content), {
		httpMetadata: { contentType: 'application/json' },
	})
	stored.keys.push(contentKey)
	const thumbnail = item.thumbnail
		? await putThumbnail(env, item.thumbnail, item.darkThumbnail, stored.uploads)
		: null
	return { thumbnail, ownedObjectNames }
}

/** An item's content, to members of its library's workspace. */
export async function getLibraryItemContent(request: IRequest, env: Environment) {
	const auth = await requireAuth(request, env)
	const itemId = request.params.itemId
	if (!itemId) return badRequest('Item id is required')

	const db = createPostgresConnectionPool(env, 'getLibraryItem')
	try {
		const access = await getLibraryItemAccess(db, auth.userId, itemId)
		if (!access || !isRole(access.role)) return notFound()
	} finally {
		await db.destroy()
	}

	const object = await env.ROOMS.get(getLibraryItemContentKey(itemId))
	if (!object) return notFound()
	// Items are never edited, so what's stored under an id doesn't change.
	return new Response(object.body, {
		headers: {
			'content-type': 'application/json',
			'cache-control': 'private, max-age=31536000, immutable',
		},
	})
}
