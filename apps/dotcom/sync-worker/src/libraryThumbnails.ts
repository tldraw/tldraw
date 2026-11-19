import {
	LibraryItemPersistenceColumns,
	TlaLibraryItem,
	TlaLibraryItemThumbnail,
} from '@tldraw/dotcom-shared'
import { uniqueId } from '@tldraw/utils'
import { RawBuilder, sql } from 'kysely'
import { Environment } from './types'

// An item's thumbnails are public uploads, served by object name like a board's images, under
// random names: only someone who can list the item learns their URLs. Its content stays private in
// the ROOMS bucket (see libraryStorage).

export const MAX_LIBRARY_ITEM_THUMBNAIL_BYTES = 1_000_000
// SVG is served like any upload, with a CSP that keeps its script from running.
export const LIBRARY_ITEM_THUMBNAIL_TYPES: ReadonlySet<string> = new Set([
	'image/png',
	'image/webp',
	'image/jpeg',
	'image/svg+xml',
])

/**
 * The value to write to library_item."thumbnail". node-postgres passes a string parameter
 * through as it is, and jsonb would read a bare URL as malformed JSON, so it is encoded here. It
 * comes back as a query value rather than a string because a string is also a thumbnail: the
 * encoded JSON could otherwise be read back as one.
 */
export function toThumbnailColumn(
	thumbnail: TlaLibraryItemThumbnail | null
): RawBuilder<TlaLibraryItemThumbnail> | null {
	return thumbnail === null ? null : sql<TlaLibraryItemThumbnail>`${JSON.stringify(thumbnail)}`
}

/** A library_item row as it is inserted, its thumbnail written with toThumbnailColumn. */
export type LibraryItemInsertRow = Omit<TlaLibraryItem, 'thumbnail'> &
	LibraryItemPersistenceColumns & {
		thumbnail: ReturnType<typeof toThumbnailColumn>
	}

/** A thumbnail image to store as a public upload, and the name it's stored under. */
export interface ThumbnailUpload {
	image: Blob
	objectName: string
}

/** Names a thumbnail image's upload, before it is stored. */
export function nameThumbnailUpload(image: Blob): ThumbnailUpload {
	const extension = image.type === 'image/svg+xml' ? 'svg' : image.type.split('/')[1]
	return { image, objectName: `${uniqueId()}-${extension}` }
}

/**
 * Stores a thumbnail's images as public uploads and returns their URLs: one, or a light and a dark
 * one.
 */
export async function putThumbnail(
	env: Environment,
	light: ThumbnailUpload,
	dark: ThumbnailUpload | null
): Promise<TlaLibraryItemThumbnail> {
	const lightUrl = await putImage(env, light)
	return dark ? { light: lightUrl, dark: await putImage(env, dark) } : lightUrl
}

async function putImage(env: Environment, { image, objectName }: ThumbnailUpload) {
	await env.UPLOADS.put(objectName, await image.arrayBuffer(), {
		httpMetadata: { contentType: image.type },
	})
	return `${getUserContentUrl(env)}/${objectName}`
}

function getUserContentUrl(env: Environment) {
	if (!env.USER_CONTENT_URL) throw new Error('USER_CONTENT_URL is required to store thumbnails')
	return env.USER_CONTENT_URL
}
