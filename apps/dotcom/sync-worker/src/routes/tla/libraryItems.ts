import {
	can,
	DB,
	isRole,
	MAX_LIBRARY_ITEMS_PER_REQUEST,
	MAX_LIBRARY_ITEMS_REQUEST_BYTES,
	MAX_LIBRARY_META_LENGTH,
	MAX_LIBRARY_NAME_LENGTH,
	TlaLibraryItemThumbnail,
} from '@tldraw/dotcom-shared'
import type { JsonObject } from '@tldraw/utils'
import { IRequest } from 'itty-router'
import { Kysely, sql } from 'kysely'
import { AssetToReplace } from '../../assetAssociation'
import { LibraryItemObject, queueLibraryObjectDeletes } from '../../libraryEffects'
import { copyItemAssets, planItemAssetCopies, StoredItemContent } from '../../libraryItemAssets'
import {
	getLibraryAccess,
	getLibraryItemAccess,
	isAnyItemIdTaken,
	isClientPickedId,
	MAX_LIBRARY_ITEM_CONTENT_BYTES,
	newLibraryItemContentKey,
	R2ConnectionQueue,
	runStorageTasks,
} from '../../libraryStorage'
import {
	LIBRARY_ITEM_THUMBNAIL_TYPES,
	MAX_LIBRARY_ITEM_THUMBNAIL_BYTES,
	LibraryItemInsertRow,
	nameThumbnailUpload,
	putThumbnail,
	ThumbnailUpload,
	toThumbnailColumn,
} from '../../libraryThumbnails'
import { createPostgresConnectionPool } from '../../postgres'
import { Environment } from '../../types'
import { canUseLibraries } from '../../utils/featureFlags'
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
		return badRequest('Thumbnail must be PNG, WebP, JPEG or SVG')
	}
	if (value.size > MAX_LIBRARY_ITEM_THUMBNAIL_BYTES) return tooLarge('Thumbnail is too large')
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

function isJsonObject(value: unknown): value is JsonObject {
	return !!value && typeof value === 'object' && !Array.isArray(value)
}

// A meta field: {} when it's left out, or the response refusing it.
async function readMeta(value: FormDataEntryValue | null): Promise<JsonObject | Response> {
	const text = await readText(value)
	if (text === null) return {}
	if (text.length > MAX_LIBRARY_META_LENGTH) return tooLarge('Meta is too large')
	const meta = parseJson(text)
	if (!meta || !isJsonObject(meta.value)) return badRequest('Meta must be a JSON object')
	return meta.value
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
	meta: JsonObject
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

		const meta = await readMeta(form.get(`meta:${id}`))
		if (meta instanceof Response) return meta

		bytes += contentBytes + (thumbnail?.size ?? 0) + (darkThumbnail?.size ?? 0)
		if (bytes > MAX_LIBRARY_ITEMS_REQUEST_BYTES) return tooLarge('The items are too large')
		items.push({
			id,
			name: typeof name === 'string' ? name.trim().slice(0, MAX_LIBRARY_NAME_LENGTH) || null : null,
			content: content.value,
			thumbnail,
			darkThumbnail,
			meta,
		})
	}
	return items
}

/**
 * Adds items to a library, in the order the request lists them: gives each its own copies of
 * the uploads its content refers to (see copyItemAssets), stores its content (a
 * TLLibraryItemContent as JSON) privately and its optional thumbnails as public uploads, then
 * inserts all their rows together, with the thumbnails' URLs, which reach clients through Zero,
 * and a library_item_object row for each object each item stored. Every object is named, and
 * queued for deletion (see queueLibraryObjectDeletes), before any is stored, so a failed or stopped
 * request leaves nothing behind once the processor has drained it. Items are stored a few at a
 * time; each row's createdAt is a step later than the one before, since items are listed by it.
 *
 * The client picks each item's id, as it does a file's, so it can list the items under those ids
 * while this runs. Ids that are taken are refused with 409 before anything is stored, unless every
 * one is an item this user added: a retry, answered with those items. If another request takes one
 * meanwhile, the row insert finds it and this answers 409, inserting no row. The
 * worker picks every object's name, so a request can't overwrite stored content.
 *
 * Form fields: `items`, a JSON list of `{ id, name? }` with each id made by uniqueId; then for each
 * item, by its id, `content:<id>`, `thumbnail:<id>` (optional, PNG, WebP, JPEG or SVG),
 * `darkThumbnail:<id>` (optional, and only with `thumbnail:<id>`, which is then the light one of
 * the pair) and `meta:<id>` (optional, a JSON object of at most MAX_LIBRARY_META_LENGTH
 * characters). At most MAX_LIBRARY_ITEMS_PER_REQUEST items, of at most
 * MAX_LIBRARY_ITEMS_REQUEST_BYTES of content and thumbnails together.
 *
 * Adding items changes a starter pack's copy, so the library's `meta` loses the pack's `packId`
 * (see clearPackId in the mutators), unless `fillsPackCopy` is `true`: the items are the pack's
 * own, sent as the user copies it. That's taken only from the library's creator, whose copy it is.
 */
export async function addLibraryItems(request: IRequest, env: Environment) {
	const auth = await requireAuth(request, env)
	if (!(await canUseLibraries(env, auth.userId))) return notFound()
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

		const fillsPackCopy =
			form.get('fillsPackCopy') === 'true' && access.library.createdBy === auth.userId

		const ids = items.map((item) => item.id)
		if (await isAnyItemIdTaken(db, ids)) {
			const added = await getAddedItems(db, auth.userId, ids)
			return added ? Response.json(added) : conflict()
		}

		const planned = items.map((item) => planItemObjects(env, item))
		const objectsByItem = planned.map(plannedObjects)
		// Queued before anything is stored, so what this stores is deleted if it fails or is stopped
		// before the rows below name it.
		await queueLibraryObjectDeletes(db, objectsByItem.flat())

		const r2 = new R2ConnectionQueue()
		const storedItems = await runStorageTasks(
			items.map((item, index) => () => storeItemObjects(env, r2, item, planned[index]))
		)
		const now = Date.now()
		const rows: LibraryItemInsertRow[] = items.map((item, index) => ({
			id: item.id,
			libraryId,
			name: item.name,
			thumbnail: toThumbnailColumn(storedItems[index].thumbnail),
			contentKey: planned[index].contentKey,
			createdBy: auth.userId,
			createdAt: now + index,
			updatedAt: now,
			meta: item.meta,
		}))
		const objects = items.flatMap((item, index) => {
			const skipped = new Set(storedItems[index].skippedObjectNames)
			return objectsByItem[index]
				.filter((object) => !skipped.has(object.objectName))
				.map((object) => ({ itemId: item.id, ...object }))
		})

		try {
			await db.transaction().execute(async (tx) => {
				const inserted = await tx
					.insertInto('library_item')
					.values(rows)
					.onConflict((oc) => oc.column('id').doNothing())
					.returning('id')
					.execute()
				if (inserted.length < rows.length) throw new IdTakenError()
				await tx.insertInto('library_item_object').values(objects).execute()
				if (!fillsPackCopy) {
					await tx
						.updateTable('library')
						.set({ meta: sql`"meta" - 'packId'` })
						.where('id', '=', libraryId)
						.where(sql<boolean>`"meta" ? 'packId'`)
						.execute()
				}
			})
		} catch (error) {
			if (error instanceof IdTakenError) return conflict()
			throw error
		}

		return Response.json({
			items: rows.map((row, index) => ({
				id: row.id,
				createdAt: row.createdAt,
				thumbnail: storedItems[index].thumbnail,
			})),
		} satisfies AddLibraryItemsResponseBody)
	} finally {
		await db.destroy()
	}
}

/**
 * The answer to a request that already added these items, when it's retried after its answer was
 * lost: every id is an item this user added. Null if any isn't.
 */
async function getAddedItems(
	db: Kysely<DB>,
	userId: string,
	ids: string[]
): Promise<AddLibraryItemsResponseBody | null> {
	const rows = await db
		.selectFrom('library_item')
		.select(['id', 'createdAt', 'thumbnail'])
		.where('id', 'in', ids)
		.where('createdBy', '=', userId)
		.execute()
	const byId = new Map(rows.map((row) => [row.id, row]))
	const items = ids.flatMap((id) => {
		const row = byId.get(id)
		return row ? [{ id, createdAt: row.createdAt, thumbnail: row.thumbnail ?? null }] : []
	})
	return items.length === ids.length ? { items } : null
}

interface PlannedItemObjects {
	contentKey: string
	assetCopies: AssetToReplace[]
	light: ThumbnailUpload | null
	dark: ThumbnailUpload | null
}

// Names every object an item will store, before anything is stored.
function planItemObjects(env: Environment, item: NewItem): PlannedItemObjects {
	return {
		contentKey: newLibraryItemContentKey(),
		assetCopies: planItemAssetCopies(env, item.content, item.id),
		light: item.thumbnail && nameThumbnailUpload(item.thumbnail),
		dark: item.darkThumbnail && nameThumbnailUpload(item.darkThumbnail),
	}
}

// Every object an item stores, named before any is stored: what's queued for deletion, and, less
// any copy copyItemAssets skips, what the item's rows name.
function plannedObjects(planned: PlannedItemObjects): LibraryItemObject[] {
	return [
		{ bucket: 'rooms', objectName: planned.contentKey },
		...[
			...planned.assetCopies.map((copy) => copy.newObjectName),
			...[planned.light, planned.dark].flatMap((upload) => (upload ? [upload.objectName] : [])),
		].map((objectName) => ({ bucket: 'uploads' as const, objectName })),
	]
}

/**
 * Stores an item's content, with its own copies of the uploads it refers to, and its thumbnails,
 * under the names planItemObjects gave them. Returns its thumbnail and the names of the copies it
 * skipped.
 */
async function storeItemObjects(
	env: Environment,
	r2: R2ConnectionQueue,
	item: NewItem,
	planned: PlannedItemObjects
) {
	const { content, skippedObjectNames } = await copyItemAssets(
		env,
		r2,
		item.content,
		planned.assetCopies
	)
	await r2.run(1, () =>
		env.ROOMS.put(planned.contentKey, JSON.stringify(content), {
			httpMetadata: { contentType: 'application/json' },
		})
	)
	const thumbnail = planned.light && (await putThumbnail(env, r2, planned.light, planned.dark))
	return { thumbnail, skippedObjectNames }
}

/**
 * An item's content, to members of its library's workspace and to anyone who can access a file
 * its library is added to.
 */
export async function getLibraryItemContent(request: IRequest, env: Environment) {
	const auth = await requireAuth(request, env)
	if (!(await canUseLibraries(env, auth.userId))) return notFound()
	const itemId = request.params.itemId
	if (!itemId) return badRequest('Item id is required')

	const db = createPostgresConnectionPool(env, 'getLibraryItem')
	let contentKey: string
	try {
		const access = await getLibraryItemAccess(db, auth.userId, itemId)
		if (!access || !(isRole(access.role) || access.isOnAccessibleFile)) return notFound()
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
