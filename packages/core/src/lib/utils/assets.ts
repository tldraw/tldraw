import { fetch } from '@tldraw/utils'
import { version } from '../../version'

/**
 * Converts a data URL to a file.
 * @param url - The data URL to convert.
 * @param filename - The name of the file.
 * @param mimeType - The MIME type of the file.
 * @returns A promise that resolves to a file.
 * @public */
export async function dataUrlToFile(url: string, filename: string, mimeType: string) {
	const res = await fetch(url)
	const buf = await res.arrayBuffer()
	return new File([buf], filename, { type: mimeType })
}

/** @internal */
const CDN_BASE_URL = 'https://cdn.tldraw.com'

/**
 * Gets the default CDN base URL.
 * @returns The default CDN base URL.
 * @public */
export function getDefaultCdnBaseUrl() {
	return `${CDN_BASE_URL}/${version}`
}
