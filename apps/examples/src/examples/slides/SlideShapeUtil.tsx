import { useCallback } from 'react'
import {
	Geometry2d,
	RecordProps,
	Rectangle2d,
	SVGContainer,
	ShapeUtil,
	T,
	TLBaseShape,
	TLOnResizeHandler,
	getPerfectDashProps,
	resizeBox,
	useValue,
} from 'tldraw'
import { moveToSlide, useSlides } from './useSlides'

export type SlideShape = TLBaseShape<
	'slide',
	{
		w: number
		h: number
	}
>

export class SlideShapeUtil extends ShapeUtil<SlideShape> {
	static override type = 'slide' as const
	static override props: RecordProps<SlideShape> = {
		w: T.number,
		h: T.number,
	}

	override canBind = () => false
	override hideRotateHandle = () => true

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

	override onRotate = (initial: SlideShape) => initial
	override onResize: TLOnResizeHandler<SlideShape> = (shape, info) => {
		return resizeBox(shape, info)
	}

	override onDoubleClick = (shape: SlideShape) => {
		moveToSlide(this.editor, shape)
		this.editor.selectNone()
	}

	override onDoubleClickEdge = (shape: SlideShape) => {
		moveToSlide(this.editor, shape)
		this.editor.selectNone()
	}

	component(shape: SlideShape) {
		const bounds = this.editor.getShapeGeometry(shape).bounds

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
				<div onPointerDown={handleLabelPointerDown} className="slide-shape-label">
					{`Slide ${index + 1}`}
				</div>
				<SVGContainer>
					<g
						style={{
							stroke: 'var(--color-text)',
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

	indicator(shape: SlideShape) {
		return <rect width={shape.props.w} height={shape.props.h} />
	}
}
