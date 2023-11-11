import { Editor, TLShapeId, TLSvgOptions, useEditor } from '@tldraw/editor'
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
		(ids: TLShapeId[] = editor.selectedShapeIds, format: TLCopyType = 'svg') => {
			copyAs(editor, ids, format).catch(() => {
				addToast({
					id: 'copy-fail',
					icon: 'warning-triangle',
					title: msg('toast.error.copy-fail.title'),
					description: msg('toast.error.copy-fail.desc'),
				})
			})
		},
		[editor, addToast, msg]
	)
}

// it's important that this function itself isn't async - we need to
// create the relevant `ClipboardItem`s synchronously to make sure
// safari knows that the user _wants_ to copy:
// https://bugs.webkit.org/show_bug.cgi?id=222262
//
// this is fine for navigator.clipboard.write, but for fallbacks it's a
// little awkward.
export async function copyAs(
	editor: Editor,
	ids: TLShapeId[],
	format: TLCopyType = 'svg',
	opts = {} as Partial<TLSvgOptions>
) {
	if (ids.length === 0) {
		ids = [...editor.currentPageShapeIds]
	}

	if (ids.length === 0) {
		return
	}

	const svg = await editor.getSvg(ids, {
		scale: 1,
		background: editor.instanceState.exportBackground,
		...opts,
	})

	if (!svg) {
		throw new Error('Could not construct SVG.')
	}

	switch (format) {
		case 'svg': {
			if (window.navigator.clipboard) {
				if (window.navigator.clipboard.write) {
					window.navigator.clipboard.write([
						new ClipboardItem({
							'text/plain': new Blob([getSvgAsString(svg)], { type: 'text/plain' }),
						}),
					])
				} else {
					fallbackWriteTextAsync(async () => getSvgAsString(svg))
				}
			}
			break
		}

		case 'jpeg':
		case 'png': {
			// Note: This needs to use the promise based approach for safari/ios to not bail on a permissions error.
			const blobPromise = getSvgAsImage(svg, editor.environment.isSafari, {
				type: format,
				quality: 1,
				scale: 2,
			}).then((blob) => {
				if (blob) {
					if (window.navigator.clipboard) {
						return blob
					}
					throw new Error('Copy not supported')
				} else {
					throw new Error('Copy not possible')
				}
			})

			const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png'
			window.navigator.clipboard
				.write([
					new ClipboardItem({
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
}

async function fallbackWriteTextAsync(getText: () => Promise<string>) {
	if (!(navigator && navigator.clipboard)) return
	navigator.clipboard.writeText(await getText())
}
