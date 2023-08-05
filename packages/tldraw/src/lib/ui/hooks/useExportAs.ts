import { TLFrameShape, TLShapeId, useEditor } from '@tldraw/editor'
import { useCallback } from 'react'
import {
	TLExportType,
	downloadDataURLAsFile,
	getSvgAsDataUrl,
	getSvgAsImage,
} from '../../utils/export'
import { useToasts } from './useToastsProvider'
import { useTranslation } from './useTranslation/useTranslation'

/** @public */
export function useExportAs() {
	const editor = useEditor()
	const { addToast } = useToasts()
	const msg = useTranslation()

	return useCallback(
		async function exportAs(
			ids: TLShapeId[] = editor.selectedShapeIds,
			format: TLExportType = 'png'
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
			})

			if (!svg) throw new Error('Could not construct SVG.')

			let name = 'shapes'

			if (ids.length === 1) {
				const first = editor.getShape(ids[0])!
				if (editor.isShapeOfType<TLFrameShape>(first, 'frame')) {
					name = first.props.name ?? 'frame'
				} else {
					name = first.id.replace(/:/, '_')
				}
			}

			switch (format) {
				case 'svg': {
					const dataURL = await getSvgAsDataUrl(svg)
					downloadDataURLAsFile(dataURL, `${name || 'shapes'}.svg`)
					return
				}
				case 'webp':
				case 'png': {
					const image = await getSvgAsImage(svg, {
						type: format,
						quality: 1,
						scale: 2,
					})

					if (!image) {
						addToast({
							id: 'export-fail',
							// icon: 'error',
							title: msg('toast.error.export-fail.title'),
							description: msg('toast.error.export-fail.desc'),
						})
						return
					}

					const dataURL = URL.createObjectURL(image)

					downloadDataURLAsFile(dataURL, `${name || 'shapes'}.${format}`)

					URL.revokeObjectURL(dataURL)
					return
				}

				case 'json': {
					const data = editor.getContentFromCurrentPage(ids)
					const dataURL = URL.createObjectURL(
						new Blob([JSON.stringify(data, null, 4)], { type: 'application/json' })
					)

					downloadDataURLAsFile(dataURL, `${name || 'shapes'}.json`)

					URL.revokeObjectURL(dataURL)
					return
				}

				default:
					throw new Error(`Export type ${format} not supported.`)
			}
		},
		[editor, addToast, msg]
	)
}
