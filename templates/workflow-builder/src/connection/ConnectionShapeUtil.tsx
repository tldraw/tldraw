import {
	CubicBezier2d,
	Editor,
	IndexKey,
	Mat,
	RecordProps,
	SVGContainer,
	ShapeUtil,
	TLBaseShape,
	TLHandle,
	TLHandleDragInfo,
	Vec,
	VecLike,
	VecModel,
	clamp,
	vecModelValidator,
} from 'tldraw'
import { getPortAtPoint, updatePortState } from '../ports/portState'
import {
	createOrUpdateConnectionBinding,
	getConnectionBindingPositionInPageSpace,
	getConnectionBindings,
	removeConnectionBinding,
} from './ConnectionBindingUtil'

export type ConnectionShape = TLBaseShape<
	'connection',
	{
		start: VecModel
		end: VecModel
	}
>

export class ConnectionShapeUtil extends ShapeUtil<ConnectionShape> {
	static override type = 'connection' as const
	static override props: RecordProps<ConnectionShape> = {
		start: vecModelValidator,
		end: vecModelValidator,
	}

	getDefaultProps(): ConnectionShape['props'] {
		return {
			start: { x: 0, y: 0 },
			end: { x: 100, y: 100 },
		}
	}

	override canEdit() {
		return false
	}
	override canResize() {
		return false
	}
	override hideResizeHandles() {
		return true
	}
	override hideRotateHandle() {
		return true
	}
	override hideSelectionBoundsBg() {
		return true
	}
	override hideSelectionBoundsFg() {
		return true
	}

	getGeometry(shape: ConnectionShape) {
		const { start, end } = getConnectionTerminals(this.editor, shape)
		const [cp1, cp2] = getConnectionControlPoints(start, end)
		return new CubicBezier2d({
			start: Vec.From(start),
			cp1: Vec.From(cp1),
			cp2: Vec.From(cp2),
			end: Vec.From(end),
		})
	}

	getHandles(shape: ConnectionShape): TLHandle[] {
		const { start, end } = getConnectionTerminals(this.editor, shape)
		return [
			{
				id: 'start',
				type: 'vertex',
				index: 'a0' as IndexKey,
				x: start.x,
				y: start.y,
			},
			{
				id: 'end',
				type: 'vertex',
				index: 'a1' as IndexKey,
				x: end.x,
				y: end.y,
			},
		]
	}

	onHandleDrag(shape: ConnectionShape, { handle }: TLHandleDragInfo<ConnectionShape>) {
		const existingBindings = getConnectionBindings(this.editor, shape)
		const draggingTerminal = handle.id as 'start' | 'end'
		const oppositeTerminal = draggingTerminal === 'start' ? 'end' : 'start'

		const target = getPortAtPoint(this.editor, this.editor.inputs.currentPagePoint, {
			filter: (s) => s.id !== shape.id && s.id !== existingBindings[oppositeTerminal]?.toId,
			terminal: handle.id as 'start' | 'end',
		})

		const allowsMultipleConnections = draggingTerminal === 'start'
		const hasExistingConnection =
			target?.existingConnection && target.existingConnection.connectionId !== shape.id

		if (!target || (hasExistingConnection && !allowsMultipleConnections)) {
			updatePortState(this.editor, { hintingPort: null })
			removeConnectionBinding(this.editor, shape, draggingTerminal)

			return {
				...shape,
				props: {
					[handle.id]: { x: handle.x, y: handle.y },
				},
			}
		}

		updatePortState(this.editor, {
			hintingPort: { portId: target.port.id, shapeId: target.shape.id },
		})
		createOrUpdateConnectionBinding(this.editor, shape, target.shape, {
			portId: target.port.id,
			terminal: draggingTerminal,
		})

		return {
			...shape,
		}
	}

	component(shape: ConnectionShape) {
		const { start, end } = getConnectionTerminals(this.editor, shape)
		return (
			<SVGContainer className="ConnectionShape">
				<path d={getConnectionPath(start, end)} fill="none" stroke="black" strokeWidth={2} />
			</SVGContainer>
		)
	}

	indicator(shape: ConnectionShape) {
		const { start, end } = getConnectionTerminals(this.editor, shape)
		return <path d={getConnectionPath(start, end)} />
	}
}

function getConnectionControlPoints(start: VecLike, end: VecLike): [Vec, Vec] {
	const distance = end.x - start.x
	const adjustedDistance = Math.max(
		30,
		distance > 0 ? distance / 3 : clamp(Math.abs(distance) + 30, 0, 100)
	)
	return [new Vec(start.x + adjustedDistance, start.y), new Vec(end.x - adjustedDistance, end.y)]
}

function getConnectionPath(start: VecLike, end: VecLike) {
	const [cp1, cp2] = getConnectionControlPoints(start, end)
	return `M ${start.x} ${start.y} C ${cp1.x} ${cp1.y} ${cp2.x} ${cp2.y} ${end.x} ${end.y}`
}

export function getConnectionTerminals(editor: Editor, shape: ConnectionShape) {
	const bindings = getConnectionBindings(editor, shape)
	const shapeTransform = Mat.Inverse(editor.getShapePageTransform(shape))

	let start, end
	if (bindings.start) {
		const inPageSpace = getConnectionBindingPositionInPageSpace(editor, bindings.start)
		if (inPageSpace) {
			start = Mat.applyToPoint(shapeTransform, inPageSpace)
		}
	}
	if (bindings.end) {
		const inPageSpace = getConnectionBindingPositionInPageSpace(editor, bindings.end)
		if (inPageSpace) {
			end = Mat.applyToPoint(shapeTransform, inPageSpace)
		}
	}
	if (!start) start = shape.props.start
	if (!end) end = shape.props.end

	return { start, end }
}
