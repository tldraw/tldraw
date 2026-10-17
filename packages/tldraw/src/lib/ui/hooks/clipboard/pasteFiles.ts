import { Editor, TLExternalContentSource, VecLike } from '@tldraw/editor'
import { runBeforePasteFromClipboard } from './putPastedContent'

/**
 * When the clipboard has a file, create an image/video shape from the file and paste it into the scene.
 *
 * @param editor - The editor instance.
 * @param urls - The file urls.
 * @param point - The point at which to paste the file.
 * @internal
 */
export async function pasteFiles(
	editor: Editor,
	blobs: (File | Blob)[],
	point?: VecLike,
	sources?: TLExternalContentSource[],
	clipboardPasteSource: 'native-event' | 'clipboard-read' = 'native-event'
) {
	const files = blobs.map((blob) =>
		blob instanceof File ? blob : new File([blob], 'tldrawFile', { type: blob.type })
	)

	editor.markHistoryStoppingPoint('paste')

	const content = await runBeforePasteFromClipboard(
		editor,
		{ type: 'files', files, point, sources },
		{ source: clipboardPasteSource, point }
	)
	if (!content) return

	// When a single image is pasted while an image is being cropped, replace the
	// cropped image in place instead of creating a new shape. This matches the
	// "replace image" action, preserving the crop transform across the swap.
	const croppingShapeId = editor.getCroppingShapeId()
	if (
		croppingShapeId &&
		editor.getShape(croppingShapeId)?.type === 'image' &&
		content.type === 'files' &&
		content.files.length === 1 &&
		content.files[0].type.startsWith('image/')
	) {
		await editor.replaceExternalContent({
			type: 'file-replace',
			file: content.files[0],
			shapeId: croppingShapeId,
			isImage: true,
		})
		return
	}

	await editor.putExternalContent(content)
}
