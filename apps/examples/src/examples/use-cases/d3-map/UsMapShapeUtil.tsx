import {
	Editor,
	Geometry2d,
	RecordProps,
	Rectangle2d,
	SVGContainer,
	ShapeUtil,
	T,
	TLResizeInfo,
	TLShape,
	createShapeId,
	resizeBox,
} from 'tldraw'
import { STATE_COLORS } from './D3MapExample'
import { MAP_HEIGHT, MAP_WIDTH, getUsStatesData } from './us-map-data'

const US_MAP_TYPE = 'us-map' as const

declare module 'tldraw' {
	export interface TLGlobalShapePropsMap {
		[US_MAP_TYPE]: { w: number; h: number }
	}
}

export type UsMapShape = TLShape<typeof US_MAP_TYPE>

const statesData = getUsStatesData()

export function explodeMap(editor: Editor, shape: UsMapShape) {
	const bounds = editor.getShapePageBounds(shape)
	if (!bounds) return

	const scaleX = bounds.w / MAP_WIDTH
	const scaleY = bounds.h / MAP_HEIGHT

	editor.run(
		() => {
			const newShapes = statesData.map((state, i) => ({
				id: createShapeId(),
				type: 'us-state' as const,
				x: bounds.x + state.bounds.x * scaleX,
				y: bounds.y + state.bounds.y * scaleY,
				props: {
					w: state.bounds.w * scaleX,
					h: state.bounds.h * scaleY,
					name: state.name,
					pathData: state.pathData,
					fill: STATE_COLORS[i % STATE_COLORS.length],
					originalW: state.bounds.w,
					originalH: state.bounds.h,
					pathOffsetX: state.bounds.x,
					pathOffsetY: state.bounds.y,
				},
			}))

			editor.deleteShape(shape.id)
			editor.createShapes(newShapes)
		},
		{ history: 'record-preserveRedoStack' }
	)
}

export class UsMapShapeUtil extends ShapeUtil<UsMapShape> {
	static override type = US_MAP_TYPE
	static override props: RecordProps<UsMapShape> = {
		w: T.number,
		h: T.number,
	}

	getDefaultProps(): UsMapShape['props'] {
		return { w: MAP_WIDTH, h: MAP_HEIGHT }
	}

	override canResize() {
		return true
	}
	override isAspectRatioLocked() {
		return true
	}

	getGeometry(shape: UsMapShape): Geometry2d {
		return new Rectangle2d({
			width: shape.props.w,
			height: shape.props.h,
			isFilled: true,
		})
	}

	override onResize(shape: UsMapShape, info: TLResizeInfo<UsMapShape>) {
		return resizeBox(shape, info)
	}

	override onDoubleClick(shape: UsMapShape) {
		explodeMap(this.editor, shape)
	}

	component(shape: UsMapShape) {
		const scaleX = shape.props.w / MAP_WIDTH
		const scaleY = shape.props.h / MAP_HEIGHT

		return (
			<>
				<SVGContainer>
					<g transform={`scale(${scaleX}, ${scaleY})`}>
						{statesData.map((state, i) => (
							<path
								key={state.id}
								d={state.pathData}
								fill={STATE_COLORS[i % STATE_COLORS.length]}
								stroke="#fff"
								strokeWidth={1 / scaleX}
								strokeLinejoin="round"
							/>
						))}
					</g>
				</SVGContainer>
				<button
					className="d3-map-explode-button"
					onPointerDown={(e) => e.stopPropagation()}
					onClick={() => explodeMap(this.editor, shape)}
					style={{ pointerEvents: 'all' }}
				>
					Explode states
				</button>
			</>
		)
	}
}
