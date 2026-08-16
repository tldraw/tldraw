import { useCallback } from 'react'
import {
	Geometry2d,
	RecordProps,
	Rectangle2d,
	SVGContainer,
	ShapeUtil,
	T,
	TLResizeInfo,
	TLShape,
	getPerfectDashProps,
	resizeBox,
	useValue,
} from 'tldraw'
import { moveToSlide, useSlides } from './useSlides'

const SLIDE_TYPE = 'slide'

declare module 'tldraw' {
	export interface TLGlobalShapePropsMap {
		[SLIDE_TYPE]: {
			w: number
			h: number
		}
	}
}

export type SlideShape = TLShape<typeof SLIDE_TYPE>

export class SlideShapeUtil extends ShapeUtil<SlideShape> {
	static override type = SLIDE_TYPE
	static override props: RecordProps<SlideShape> = {
		w: T.number,
		h: T.number,
	}

	override canBind() {
		return false
	}
	override hideRotateHandle() {
		return true
	}

	getDefaultProps(): SlideShape['props'] {
		return {
			w: 720,
			h: 480,
		}
	}

	getGeometry(shape: SlideShape): Geometry2d {
		return new Rectangle2d({
			width: shape.props.w,
			height: shape.props.h,
			isFilled: false,
		})
	}

	// [1]
	override onRotate(initial: SlideShape) {
		return initial
	}

	override onResize(shape: SlideShape, info: TLResizeInfo<SlideShape>) {
		return resizeBox(shape, info)
	}

	override onDoubleClick(shape: SlideShape) {
		moveToSlide(this.editor, shape)
		this.editor.selectNone()
	}

	override onDoubleClickEdge(shape: SlideShape) {
		moveToSlide(this.editor, shape)
		this.editor.selectNone()
	}

	component(shape: SlideShape) {
		const bounds = this.editor.getShapeGeometry(shape).bounds

		// [2]
		// eslint-disable-next-line react-hooks/rules-of-hooks
		const zoomLevel = useValue('zoom level', () => this.editor.getZoomLevel(), [this.editor])

		// eslint-disable-next-line react-hooks/rules-of-hooks
		const slides = useSlides()
		const index = slides.findIndex((s) => s.id === shape.id)

		// eslint-disable-next-line react-hooks/rules-of-hooks
		const handleLabelPointerDown = useCallback(() => this.editor.select(shape.id), [shape.id])

		if (!bounds) return null

		return (
			<>
				{/* [3] */}
				<div onPointerDown={handleLabelPointerDown} className="slide-shape-label">
					{`Slide ${index + 1}`}
				</div>
				<SVGContainer>
					<g
						style={{
							stroke: 'var(--tl-color-text)',
							strokeWidth: 'calc(1px * var(--tl-scale))',
							opacity: 0.25,
						}}
						pointerEvents="none"
						strokeLinecap="round"
						strokeLinejoin="round"
					>
						{bounds.sides.map((side, i) => {
							const { strokeDasharray, strokeDashoffset } = getPerfectDashProps(
								side[0].dist(side[1]),
								1 / zoomLevel,
								{
									style: 'dashed',
									lengthRatio: 6,
									forceSolid: zoomLevel < 0.2,
								}
							)

							return (
								<line
									key={i}
									x1={side[0].x}
									y1={side[0].y}
									x2={side[1].x}
									y2={side[1].y}
									strokeDasharray={strokeDasharray}
									strokeDashoffset={strokeDashoffset}
								/>
							)
						})}
					</g>
				</SVGContainer>
			</>
		)
	}

	getIndicatorPath(shape: SlideShape) {
		const path = new Path2D()
		path.rect(0, 0, shape.props.w, shape.props.h)
		return path
	}
}

/*
[1]
Slides can't be rotated: the rotate handle is hidden and `onRotate` returns the initial
shape so rotation via other paths (e.g. the context menu's rotate actions) is a no-op.

[2]
The dashed border is drawn with `getPerfectDashProps` at a length scaled to the zoom level,
so the dashes stay the same size on screen at any zoom, and falls back to a solid line when
zoomed far out.

[3]
The geometry is unfilled, so clicking inside a slide selects the shapes on it rather than
the slide. The label in the corner is the one place a pointer-down selects the slide itself.
*/
