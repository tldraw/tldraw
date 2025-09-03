import {
	Editor,
	FileHelpers,
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
