import {
	Box,
	createComputedCache,
	Editor,
	Mat,
	TLArrowBinding,
	TLArrowShape,
	VecModel,
} from '@tldraw/editor'
import { getArrowBindings } from '../shared'

const elbowArrowInfoCache = createComputedCache(
	'elbow arrow info',
	(editor: Editor, arrow: TLArrowShape) => {
		if (!arrow.props.elbow) return null

		const bindings = getArrowBindings(editor, arrow)

		const startBounds = getBindingBounds(editor, bindings.start, arrow.props.start)
		const endBounds = getBindingBounds(editor, bindings.end, arrow.props.end)
		const centerBounds = Box.FromPoints([startBounds.center, endBounds.center])
	}
)

export function getElbowArrowInfo(editor: Editor, arrow: TLArrowShape) {}

function getBindingBounds(editor: Editor, binding: TLArrowBinding | undefined, point: VecModel) {
	const defaultValue = Box.FromCenter(point, { x: 1, y: 1 })
	if (!binding) {
		return defaultValue
	}

	const shapeGeometry = editor.getShapeGeometry(binding.toId)
	if (!shapeGeometry) {
		return defaultValue
	}

	const arrowTransform = editor.getShapePageTransform(binding.fromId)
	const shapeTransform = editor.getShapePageTransform(binding.toId)
	const shapeToArrowTransform = shapeTransform.clone().multiply(Mat.Inverse(arrowTransform))

	const vertices = shapeToArrowTransform.applyToPoints(shapeGeometry.vertices)
	const bounds = Box.FromPoints(vertices)

	return bounds
}
