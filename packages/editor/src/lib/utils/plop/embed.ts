import { createShapeId } from '@tldraw/tlschema'
import { Editor } from '../../editor/Editor'
import { TLCreateShapeFromSourceInfo } from '../../editor/types/shape-create-types'

/** @internal */
export async function plopEmbed(
	editor: Editor,
	{ point, url, embed }: Extract<TLCreateShapeFromSourceInfo, { type: 'embed' }>
) {
	const position =
		point ?? (editor.inputs.shiftKey ? editor.inputs.currentPagePoint : editor.viewportPageCenter)

	const { width, height, doesResize } = embed

	editor.createShapes(
		[
			{
				id: createShapeId(),
				type: 'embed',
				x: position.x - (width || 450) / 2,
				y: position.y - (height || 450) / 2,
				props: {
					w: width,
					h: height,
					doesResize: doesResize,
					url,
				},
			},
		],
		true
	)
}
