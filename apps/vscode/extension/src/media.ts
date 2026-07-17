import { DEFAULT_SUPPORTED_MEDIA_TYPES } from 'tldraw'

const EXTENSION_TO_DEFAULT_MIME_TYPE = {
	// Vector image extensions
	svg: 'image/svg+xml',

	// Static image extensions
	jpeg: 'image/jpeg',
	png: 'image/png',
	webp: 'image/webp',

	// Animated image extensions
	gif: 'image/gif',
	apng: 'image/apng',
	avif: 'image/avif',

	// Video extensions
	mp4: 'video/mp4',
	webm: 'video/webm',
	mov: 'video/quicktime',
	qt: 'video/quicktime',
} as const

type DefaultSupportedMimeType = (typeof DEFAULT_SUPPORTED_MEDIA_TYPES)[number]
type DefaultSupportedExtensions = keyof typeof EXTENSION_TO_DEFAULT_MIME_TYPE

// We use these types to enforce that we don't have any extra mime types in the EXTENSION_TO_MIME_TYPE map
// and that we don't miss any mime types in the DEFAULT_SUPPORTED_MEDIA_TYPES array
type ExtensionMapMimeTypes =
	(typeof EXTENSION_TO_DEFAULT_MIME_TYPE)[keyof typeof EXTENSION_TO_DEFAULT_MIME_TYPE]
type _CheckMimeTypesCovered = DefaultSupportedMimeType extends ExtensionMapMimeTypes ? true : never
type _CheckNoExtraMimeTypes = ExtensionMapMimeTypes extends DefaultSupportedMimeType ? true : never
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const mimeTypesCovered: _CheckMimeTypesCovered = true
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const noExtraMimeTypes: _CheckNoExtraMimeTypes = true

function isSupportedExtension(extension: string): extension is DefaultSupportedExtensions {
	return extension in EXTENSION_TO_DEFAULT_MIME_TYPE
}

export function getMimeTypeFromPath(filePath: string): string {
	const extension = filePath.split('.').pop()?.toLowerCase()
	if (!extension) throw new Error('No extension found in file path')

	if (isSupportedExtension(extension)) {
		return EXTENSION_TO_DEFAULT_MIME_TYPE[extension]
	}
	throw new Error(`Unsupported file type: ${extension}`)
}
