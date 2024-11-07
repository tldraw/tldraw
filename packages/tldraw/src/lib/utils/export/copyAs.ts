import {
	Editor,
	FileHelpers,
	TLImageExportOptions,
	TLShapeId,
	exhaustiveSwitchError,
} from '@tldraw/editor'
import {
	clipboardWrite,
	doesClipboardSupportType,
	getAdditionalClipboardWriteType,
} from '../clipboard'
import { exportToBlobPromise, exportToString } from './export'

/** @public */
export type TLCopyType = 'svg' | 'png' | 'jpeg' | 'json'

/**
 * Copy the given shapes to the clipboard.
 *
 * @param editor - The editor instance.
 * @param ids - The ids of the shapes to copy.
 * @param format - The format to copy as.
 * @param opts - Options for the copy.
 *
 * @public
 */
export function copyAs(
	editor: Editor,
	ids: TLShapeId[],
	format: TLCopyType = 'svg',
	opts: TLImageExportOptions = {}
): Promise<void> {
	// Note:  it's important that this function itself isn't async and doesn't really use promises -
	// we need to create the relevant `ClipboardItem`s and call navigator.clipboard.write
	// synchronously to make sure safari knows that the user _wants_ to copy See
	// https://bugs.webkit.org/show_bug.cgi?id=222262

	if (!navigator.clipboard) return Promise.reject(new Error('Copy not supported'))
	if (navigator.clipboard.write as any) {
		const { blobPromise, mimeType } = exportToBlobPromise(editor, ids, format, opts)

		const types: Record<string, Promise<Blob>> = { [mimeType]: blobPromise }
		const additionalMimeType = getAdditionalClipboardWriteType(mimeType)
		if (additionalMimeType && doesClipboardSupportType(additionalMimeType)) {
			types[additionalMimeType] = blobPromise.then((blob) =>
				FileHelpers.rewriteMimeType(blob, additionalMimeType)
			)
		}

		return clipboardWrite(types)
	}

	switch (format) {
		case 'json':
		case 'svg':
			return fallbackWriteTextAsync(async () => exportToString(editor, ids, format, opts))

		case 'jpeg':
		case 'png':
			throw new Error('Copy not supported')
		default:
			exhaustiveSwitchError(format)
	}
}

async function fallbackWriteTextAsync(getText: () => Promise<string>) {
	await navigator.clipboard?.writeText?.(await getText())
}
