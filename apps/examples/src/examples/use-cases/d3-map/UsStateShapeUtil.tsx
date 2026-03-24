import {
	Geometry2d,
	RecordProps,
	Rectangle2d,
	SVGContainer,
	ShapeUtil,
	T,
	TLResizeInfo,
	TLShape,
	resizeBox,
} from 'tldraw'

const US_STATE_TYPE = 'us-state' as const

declare module 'tldraw' {
	export interface TLGlobalShapePropsMap {
		[US_STATE_TYPE]: {
			w: number
			h: number
			name: string
			pathData: string
			fill: string
			originalW: number
			originalH: number
			pathOffsetX: number
			pathOffsetY: number
		}
	}
}

export type UsStateShape = TLShape<typeof US_STATE_TYPE>

export class UsStateShapeUtil extends ShapeUtil<UsStateShape> {
	static override type = US_STATE_TYPE
	static override props: RecordProps<UsStateShape> = {
		w: T.number,
		h: T.number,
		name: T.string,
		pathData: T.string,
		fill: T.string,
		originalW: T.number,
		originalH: T.number,
		pathOffsetX: T.number,
		pathOffsetY: T.number,
	}

	getDefaultProps(): UsStateShape['props'] {
		return {
			w: 100,
			h: 100,
			name: '',
			pathData: '',
			fill: '#4e79a7',
			originalW: 100,
			originalH: 100,
			pathOffsetX: 0,
			pathOffsetY: 0,
		}
	}

	override canResize() {
		return true
	}
	override isAspectRatioLocked() {
		return true
	}

	getGeometry(shape: UsStateShape): Geometry2d {
		return new Rectangle2d({
			width: shape.props.w,
			height: shape.props.h,
			isFilled: true,
		})
	}

	override onResize(shape: UsStateShape, info: TLResizeInfo<UsStateShape>) {
		return resizeBox(shape, info)
	}

	component(shape: UsStateShape) {
		const { w, h, pathData, fill, originalW, originalH, pathOffsetX, pathOffsetY, name } =
			shape.props
		const scaleX = w / originalW
		const scaleY = h / originalH

		return (
			<>
				<SVGContainer>
					<g transform={`scale(${scaleX}, ${scaleY}) translate(${-pathOffsetX}, ${-pathOffsetY})`}>
						<path
							d={pathData}
							fill={fill}
							stroke="#fff"
							strokeWidth={1 / scaleX}
							strokeLinejoin="round"
						/>
					</g>
				</SVGContainer>
				<div
					className="d3-map-state-label"
					style={{ pointerEvents: 'none', fontSize: `calc(11px * var(--tl-scale))` }}
				>
					{name}
				</div>
			</>
		)
	}
}
