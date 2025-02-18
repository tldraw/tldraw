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
import { exportToImagePromise } from './export'

/** @public */
export type TLCopyType = 'svg' | 'png'

/** @public */
export interface CopyAsOptions extends TLImageExportOptions {
	/** The format to copy as. */
	format: TLCopyType
}

/**
 * Copy the given shapes to the clipboard.
 *
 * @param editor - The editor instance.
 * @param ids - The ids of the shapes to copy.
 * @param format - The format to copy as. Defaults to png.
 * @param opts - Options for the copy.
 *
 * @public
 */
export function copyAs(editor: Editor, ids: TLShapeId[], opts: CopyAsOptions): Promise<void>
/**
 * @deprecated The format parameter is now part of the opts object.
 * @public
 */
export function copyAs(
	editor: Editor,
	ids: TLShapeId[],
	format: TLCopyType,
	opts?: TLImageExportOptions & { format?: undefined }
): Promise<void>
export function copyAs(
	...args:
		| [editor: Editor, ids: TLShapeId[], opts: TLImageExportOptions & { format: TLCopyType }]
		| [
				editor: Editor,
				ids: TLShapeId[],
				format: TLCopyType,
				opts?: TLImageExportOptions & { format?: undefined },
		  ]
) {
	const [editor, ids, opts] =
		typeof args[2] === 'string' ? [args[0], args[1], { ...args[3], format: args[2] }] : args

	// Note:  it's important that this function itself isn't async and doesn't really use promises -
	// we need to create the relevant `ClipboardItem`s and call navigator.clipboard.write
	// synchronously to make sure safari knows that the user _wants_ to copy See
	// https://bugs.webkit.org/show_bug.cgi?id=222262

	if (!navigator.clipboard) return Promise.reject(new Error('Copy not supported'))
	if (navigator.clipboard.write as any) {
		const { blobPromise, mimeType } = exportToImagePromise(editor, ids, opts)

		const types: Record<string, Promise<Blob>> = { [mimeType]: blobPromise }
		const additionalMimeType = getAdditionalClipboardWriteType(mimeType)
		if (additionalMimeType && doesClipboardSupportType(additionalMimeType)) {
			types[additionalMimeType] = blobPromise.then((blob) =>
				FileHelpers.rewriteMimeType(blob, additionalMimeType)
			)
		}

		return clipboardWrite(types)
	}

	switch (opts.format) {
		case 'svg': {
			return fallbackWriteTextAsync(async () => {
				const result = await editor.getSvgString(ids, opts)

				if (!result) throw new Error('Failed to copy')
				return result.svg
			})
		}

		case 'png':
			throw new Error('Copy not supported')
		default:
			exhaustiveSwitchError(opts.format)
	}
}

async function fallbackWriteTextAsync(getText: () => Promise<string>) {
	await navigator.clipboard?.writeText?.(await getText())
}
