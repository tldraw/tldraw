import { Editor, TLShapeId, TLSvgOptions } from '@tldraw/editor'
import { getSvgAsImage } from './export'

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
	opts = {} as Partial<TLSvgOptions>
) {
	// Note:  it's important that this function itself isn't async - we need to create the relevant
	// `ClipboardItem`s synchronously to make sure safari knows that the user _wants_ to copy
	// See https://bugs.webkit.org/show_bug.cgi?id=222262

	return editor
		.getSvg(ids?.length ? ids : [...editor.getCurrentPageShapeIds()], {
			scale: 1,
			background: editor.getInstanceState().exportBackground,
			...opts,
		})
		.then((svg) => {
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
					if (window.navigator.clipboard.write) {
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
					}

					break
				}

				case 'json': {
					const data = editor.getContentFromCurrentPage(ids)
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
					break
				}

				default:
					throw new Error(`Copy type ${format} not supported.`)
			}
		})
}

async function fallbackWriteTextAsync(getText: () => Promise<string>) {
	navigator.clipboard?.writeText?.(await getText())
}

function getSvgAsString(svg: SVGElement) {
	const clone = svg.cloneNode(true) as SVGGraphicsElement

	svg.setAttribute('width', +svg.getAttribute('width')! + '')
	svg.setAttribute('height', +svg.getAttribute('height')! + '')

	const out = new XMLSerializer()
		.serializeToString(clone)
		.replaceAll('&#10;      ', '')
		.replaceAll(/((\s|")[0-9]*\.[0-9]{2})([0-9]*)(\b|"|\))/g, '$1')

	return out
}
