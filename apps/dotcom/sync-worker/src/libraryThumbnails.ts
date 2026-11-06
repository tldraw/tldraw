import { TlaLibraryItemThumbnail } from '@tldraw/dotcom-shared'
import { uniqueId } from '@tldraw/utils'
import { getUploadObjectName } from './assetAssociation'
import { Environment } from './types'

// An item's thumbnails are public uploads, served by object name like a board's images, under
// random names: only someone who can list the item learns their URLs. Its content stays private in
// the ROOMS bucket (see libraryStorage).

export const MAX_LIBRARY_ITEM_THUMBNAIL_BYTES = 1_000_000
// No SVG, which can carry script.
export const LIBRARY_ITEM_THUMBNAIL_TYPES: ReadonlySet<string> = new Set([
	'image/png',
	'image/webp',
	'image/jpeg',
])

/** The uploads-bucket objects a thumbnail's URLs point at. */
export function getThumbnailObjectNames(thumbnail: TlaLibraryItemThumbnail | null): string[] {
	if (thumbnail === null) return []
	const urls = typeof thumbnail === 'string' ? [thumbnail] : [thumbnail.light, thumbnail.dark]
	return urls.flatMap((src) => getUploadObjectName({ props: { src } }) ?? [])
}

/**
 * The value to write to library_item."thumbnail". node-postgres passes a string parameter
 * through as it is, and jsonb would read a bare URL as malformed JSON, so it is encoded here.
 */
export function toThumbnailColumn(thumbnail: TlaLibraryItemThumbnail | null) {
	return thumbnail === null ? null : JSON.stringify(thumbnail)
}

/**
 * Stores a thumbnail's images as new public uploads and returns their URLs: one, or a light and a
 * dark one. Their names are added to `stored`, so a caller can delete what it stored if a later
 * step fails.
 */
export async function putThumbnail(
	env: Environment,
	light: Blob,
	dark: Blob | null,
	stored: string[]
): Promise<TlaLibraryItemThumbnail> {
	const lightUrl = await putImage(env, light, stored)
	return dark ? { light: lightUrl, dark: await putImage(env, dark, stored) } : lightUrl
}

async function putImage(env: Environment, image: Blob, stored: string[]) {
	const extension = image.type.split('/')[1]
	const body = await image.arrayBuffer()
	return putObject(env, extension, body, { contentType: image.type }, stored)
}

/**
 * Copies a thumbnail's images to new public uploads, so the copy can be deleted without the
 * original. Null when the image, or the light one of a pair, is missing; a pair whose dark image
 * is missing becomes its light one alone.
 */
export async function copyThumbnail(
	env: Environment,
	thumbnail: TlaLibraryItemThumbnail | null,
	stored: string[]
): Promise<TlaLibraryItemThumbnail | null> {
	if (thumbnail === null) return null
	if (typeof thumbnail === 'string') return copyImage(env, thumbnail, stored)
	const light = await copyImage(env, thumbnail.light, stored)
	if (!light) return null
	const dark = await copyImage(env, thumbnail.dark, stored)
	return dark ? { light, dark } : light
}

async function copyImage(env: Environment, url: string, stored: string[]) {
	const objectName = getUploadObjectName({ props: { src: url } })
	const object = objectName && (await env.UPLOADS.get(objectName))
	if (!object) return null
	const extension = objectName.split('-').pop()!
	return putObject(env, extension, await object.arrayBuffer(), object.httpMetadata, stored)
}

async function putObject(
	env: Environment,
	extension: string,
	body: ArrayBuffer,
	httpMetadata: R2HTTPMetadata | undefined,
	stored: string[]
) {
	const objectName = `${uniqueId()}-${extension}`
	await env.UPLOADS.put(objectName, body, { httpMetadata })
	stored.push(objectName)
	return `${getUserContentUrl(env)}/${objectName}`
}

function getUserContentUrl(env: Environment) {
	if (!env.USER_CONTENT_URL) throw new Error('USER_CONTENT_URL is required to store thumbnails')
	return env.USER_CONTENT_URL
}
