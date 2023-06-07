import { createShapeId } from '@tldraw/tlschema'
import { Editor } from '../../editor/Editor'
import { TLCreateShapeFromInteractionInfo } from '../../editor/types/shape-create-types'

/** @internal */
export async function plopSvgText(
	editor: Editor,
	{ point, text }: Extract<TLCreateShapeFromInteractionInfo, { type: 'svg-text' }>
) {
	const position =
		point ?? (editor.inputs.shiftKey ? editor.inputs.currentPagePoint : editor.viewportPageCenter)

	const svg = new DOMParser().parseFromString(text, 'image/svg+xml').querySelector('svg')
	if (!svg) {
		throw new Error('No <svg/> element present')
	}

	let width = parseFloat(svg.getAttribute('width') || '0')
	let height = parseFloat(svg.getAttribute('height') || '0')

	if (!(width && height)) {
		document.body.appendChild(svg)
		const box = svg.getBoundingClientRect()
		document.body.removeChild(svg)

		width = box.width
		height = box.height
	}

	const asset = await editor.onCreateAssetFromFile(
		new File([text], 'asset.svg', { type: 'image/svg+xml' })
	)
	if (asset.type !== 'bookmark') {
		asset.props.w = width
		asset.props.h = height
	}

	editor.batch(() => {
		editor.createAssets([asset])

		editor.createShapes(
			[
				{
					id: createShapeId(),
					type: 'image',
					x: position.x - width / 2,
					y: position.y - height / 2,
					opacity: 1,
					props: {
						assetId: asset.id,
						w: width,
						h: height,
					},
				},
			],
			true
		)
	})
}
