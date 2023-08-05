import { Editor, TLShapeId, useEditor } from '@tldraw/editor'
import { useCallback } from 'react'
import { TLCopyType, getSvgAsImage, getSvgAsString } from '../../utils/export'
import { useToasts } from './useToastsProvider'
import { useTranslation } from './useTranslation/useTranslation'

/** @public */
export function useCopyAs() {
	const editor = useEditor()
	const { addToast } = useToasts()
	const msg = useTranslation()

	return useCallback(
		// it's important that this function itself isn't async - we need to
		// create the relevant `ClipboardItem`s synchronously to make sure
		// safari knows that the user _wants_ to copy:
		// https://bugs.webkit.org/show_bug.cgi?id=222262
		//
		// this is fine for navigator.clipboard.write, but for fallbacks it's a
		// little awkward.
		function copyAs(ids: TLShapeId[] = editor.selectedShapeIds, format: TLCopyType = 'svg') {
			if (ids.length === 0) {
				ids = [...editor.currentPageShapeIds]
			}

			if (ids.length === 0) {
				return
			}

			switch (format) {
				case 'svg': {
					if (window.navigator.clipboard) {
						if (window.navigator.clipboard.write) {
							window.navigator.clipboard.write([
								new ClipboardItem({
									'text/plain': getExportedSvgBlob(editor, ids),
								}),
							])
						} else {
							fallbackWriteTextAsync(async () =>
								getSvgAsString(await getExportSvgElement(editor, ids))
							)
						}
					}
					break
				}

				case 'jpeg':
				case 'png': {
					const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png'
					const blobPromise = getExportedImageBlob(editor, ids, format).then((blob) => {
						if (blob) {
							if (window.navigator.clipboard) {
								return blob
							}
							throw new Error('Copy not supported')
						} else {
							addToast({
								id: 'copy-fail',
								icon: 'warning-triangle',
								title: msg('toast.error.copy-fail.title'),
								description: msg('toast.error.copy-fail.desc'),
							})
							throw new Error('Copy not possible')
						}
					})

					window.navigator.clipboard
						.write([
							new ClipboardItem({
								// Note: This needs to use the promise based approach for safari/ios to not bail on a permissions error.
								[mimeType]: blobPromise,
							}),
						])
						.catch((err: any) => {
							// Firefox will fail with the above if `dom.events.asyncClipboard.clipboardItem` is enabled.
							// See <https://github.com/tldraw/tldraw/issues/1325>
							if (!err.toString().match(/^TypeError: DOMString not supported/)) {
								console.error(err)
							}

							blobPromise.then((blob) => {
								window.navigator.clipboard.write([
									new ClipboardItem({
										// Note: This needs to use the promise based approach for safari/ios to not bail on a permissions error.
										[mimeType]: blob,
									}),
								])
							})
						})

					break
				}

				case 'json': {
					const data = editor.getContentFromCurrentPage(ids)

					if (window.navigator.clipboard) {
						const jsonStr = JSON.stringify(data)

						if (window.navigator.clipboard.write) {
							window.navigator.clipboard.write([
								new ClipboardItem({
									'text/plain': new Blob([jsonStr], { type: 'text/plain' }),
								}),
							])
						} else {
							fallbackWriteTextAsync(async () => jsonStr)
						}
					}
					break
				}

				default:
					throw new Error(`Copy type ${format} not supported.`)
			}
		},
		[editor, addToast, msg]
	)
}

async function getExportSvgElement(editor: Editor, ids: TLShapeId[]) {
	const svg = await editor.getSvg(ids, {
		scale: 1,
		background: editor.instanceState.exportBackground,
	})

	if (!svg) throw new Error('Could not construct SVG.')

	return svg
}

async function getExportedSvgBlob(editor: Editor, ids: TLShapeId[]) {
	return new Blob([getSvgAsString(await getExportSvgElement(editor, ids))], {
		type: 'text/plain',
	})
}

async function getExportedImageBlob(editor: Editor, ids: TLShapeId[], format: 'png' | 'jpeg') {
	return await getSvgAsImage(await getExportSvgElement(editor, ids), {
		type: format,
		quality: 1,
		scale: 2,
	})
}

async function fallbackWriteTextAsync(getText: () => Promise<string>) {
	if (!(navigator && navigator.clipboard)) return
	navigator.clipboard.writeText(await getText())
}
