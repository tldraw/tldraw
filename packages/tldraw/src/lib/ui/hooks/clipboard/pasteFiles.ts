import { Editor, TLExternalContentSource, VecLike } from '@tldraw/editor'

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
	sources?: TLExternalContentSource[]
) {
	const files = blobs.map((blob) =>
		blob instanceof File ? blob : new File([blob], 'tldrawFile', { type: blob.type })
	)

	editor.markHistoryStoppingPoint('paste')

	await editor.putExternalContent({
		type: 'files',
		files,
		point,
		sources,
	})
}
