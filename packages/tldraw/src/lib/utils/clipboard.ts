import { getOwnProperty, objectMapFromEntries } from '@tldraw/editor'
import { TLCopyType } from './export/copyAs'

// Browsers sanitize image formats to prevent security issues when pasting between applications. For
// paste within an application though, some browsers (only chromium-based browsers as of Nov 2024)
// support custom clipboard formats starting with "web " which are unsanitized. Our PNGs include a
// special chunk which indicates they're at 2x resolution, but that normally gets stripped - so if
// you copy as png from tldraw, then paste back in, the resulting image will be 2x the expected
// size. To work around this, we write 2 version of the image to the clipboard - the normal png, and
// the same blob with a custom mime type. When pasting, we check first for the custom mime type, and
// if it's there, use that instead of the normal png.
export const TLDRAW_CUSTOM_PNG_MIME_TYPE = 'web image/vnd.tldraw+png' as const

const additionalClipboardWriteTypes = {
	png: TLDRAW_CUSTOM_PNG_MIME_TYPE,
} as const
const canonicalClipboardReadTypes = {
	[TLDRAW_CUSTOM_PNG_MIME_TYPE]: 'image/png',
}

export function getAdditionalClipboardWriteType(format: TLCopyType): string | null {
	return getOwnProperty<TLCopyType, string>(additionalClipboardWriteTypes, format) ?? null
}
export function getCanonicalClipboardReadType(mimeType: string): string {
	return getOwnProperty(canonicalClipboardReadTypes, mimeType) ?? mimeType
}

export function doesClipboardSupportType(mimeType: string): boolean {
	return (
		typeof ClipboardItem !== 'undefined' &&
		'supports' in ClipboardItem &&
		(ClipboardItem.supports as (type: string) => boolean)(mimeType)
	)
}

export function clipboardWrite(types: Record<string, Promise<Blob>>): Promise<void> {
	// Note:  it's important that this function itself isn't async and doesn't really use promises -
	// we need to create the relevant `ClipboardItem`s and call navigator.clipboard.write
	// synchronously to make sure safari knows that the user _wants_ to copy See
	// https://bugs.webkit.org/show_bug.cgi?id=222262

	const entries = Object.entries(types)

	// clipboard.write will swallow errors if any of the promises reject. we log them here so we can
	// understand what might have gone wrong.
	for (const [_, promise] of entries) promise.catch((err) => console.error(err))

	return navigator.clipboard.write([new ClipboardItem(types)]).catch((err) => {
		// Firefox will fail with the above if `dom.events.asyncClipboard.clipboardItem` is enabled.
		// See <https://github.com/tldraw/tldraw/issues/1325>
		console.error(err)

		return Promise.all(
			entries.map(async ([type, promise]) => {
				return [type, await promise] as const
			})
		).then((entries) => {
			const resolvedTypes = objectMapFromEntries(entries)
			return navigator.clipboard.write([new ClipboardItem(resolvedTypes)])
		})
	})
}
