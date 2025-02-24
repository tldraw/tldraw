import {
	Editor,
	FileHelpers,
	TLExportType,
	TLImageExportOptions,
	TLShapeId,
	exhaustiveSwitchError,
} from '@tldraw/editor'

async function getSvgString(editor: Editor, ids: TLShapeId[], opts: TLImageExportOptions) {
	const svg = await editor.getSvgString(ids, opts)
	if (!svg) {
		throw new Error('Could not construct SVG.')
	}
	return svg
}

export async function exportToString(
	editor: Editor,
	ids: TLShapeId[],
	format: 'svg' | 'json',
	opts: TLImageExportOptions = {}
) {
	switch (format) {
		case 'svg': {
			return (await getSvgString(editor, ids, opts))?.svg
		}
		case 'json': {
			const data = await editor.resolveAssetsInContent(editor.getContentFromCurrentPage(ids))
			return JSON.stringify(data)
		}
		default: {
			exhaustiveSwitchError(format)
		}
	}
}

/**
 * Export the given shapes as a blob.
 * @param editor - The editor instance.
 * @param ids - The ids of the shapes to export.
 * @param format - The format to export as.
 * @param opts - Rendering options.
 * @returns A promise that resolves to a blob.
 * @deprecated Use {@link @tldraw/editor#Editor.toImage} instead.
 * @public
 */
export async function exportToBlob({
	editor,
	ids,
	format,
	opts = {},
}: {
	editor: Editor
	ids: TLShapeId[]
	format: TLExportType
	opts?: TLImageExportOptions
}): Promise<Blob> {
	const idsToUse = ids?.length ? ids : [...editor.getCurrentPageShapeIds()]
	switch (format) {
		case 'jpeg':
		case 'png':
		case 'webp':
		case 'svg': {
			return (await editor.toImage(idsToUse, { ...opts, format })).blob
		}
		default: {
			exhaustiveSwitchError(format)
		}
	}
}

const clipboardMimeTypesByFormat = {
	jpeg: 'image/jpeg',
	png: 'image/png',
	webp: 'image/webp',
	svg: 'text/plain',
}

export function exportToImagePromiseForClipboard(
	editor: Editor,
	ids: TLShapeId[],
	opts: TLImageExportOptions = {}
): { blobPromise: Promise<Blob>; mimeType: string } {
	const idsToUse = ids?.length ? ids : [...editor.getCurrentPageShapeIds()]
	const format = opts.format ?? 'png'
	return {
		blobPromise: editor
			.toImage(idsToUse, opts)
			.then((result) =>
				FileHelpers.rewriteMimeType(result.blob, clipboardMimeTypesByFormat[format])
			),
		mimeType: clipboardMimeTypesByFormat[format],
	}
}
