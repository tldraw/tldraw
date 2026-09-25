import { Editor, FileHelpers, TLImageExportOptions, TLShapeId } from '@tldraw/editor'

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
	const mimeType = clipboardMimeTypesByFormat[opts.format ?? 'png']
	return {
		blobPromise: editor
			.toImage(idsToUse, opts)
			.then((result) => FileHelpers.rewriteMimeType(result.blob, mimeType)),
		mimeType,
	}
}
