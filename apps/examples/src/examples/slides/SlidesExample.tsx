import {
	BaseBoxShapeTool,
	EASINGS,
	Editor,
	Geometry2d,
	Rectangle2d,
	SVGContainer,
	ShapeProps,
	ShapeUtil,
	T,
	TLBaseShape,
	TLOnResizeHandler,
	Tldraw,
	TldrawUiButton,
	TldrawUiButtonIcon,
	Vec,
	resizeBox,
	stopEventPropagation,
	track,
	useEditor,
	useValue,
} from 'tldraw'
import { getPerfectDashProps } from 'tldraw/src/lib/shapes/shared/getPerfectDashProps'
import 'tldraw/tldraw.css'

type SlideShape = TLBaseShape<
	'slide',
	{
		w: number
		h: number
		name: string
	}
>

export class SlideShapeUtil extends ShapeUtil<SlideShape> {
	static override type = 'slide' as const
	static override props: ShapeProps<SlideShape> = {
		w: T.number,
		h: T.number,
		name: T.string,
	}

	override canBind = () => false
	override hideRotateHandle = () => true

	getDefaultProps(): SlideShape['props'] {
		return {
			w: 720,
			h: 480,
			name: 'Slide',
		}
	}

	getGeometry(shape: SlideShape): Geometry2d {
		return new Rectangle2d({
			width: shape.props.w,
			height: shape.props.h,
			isFilled: false,
		})
	}

	override onRotate = (initial: SlideShape) => {
		return initial
	}

	override onResize: TLOnResizeHandler<any> = (shape, info) => {
		return resizeBox(shape, info)
	}

	component(shape: SlideShape) {
		const bounds = this.editor.getShapeGeometry(shape).bounds
		// eslint-disable-next-line react-hooks/rules-of-hooks
		const zoomLevel = useValue('zoom level', () => this.editor.getZoomLevel(), [this.editor])
		if (!bounds) return null

		return (
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
								lengthRatio: 2,
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
		)
		// return (
		// 	<HTMLContainer
		// 		style={{ border: 'calc(var(--tl-scale) * 2px) solid var(--color-brush-stroke)' }}
		// 	/>
		// )
	}

	indicator(shape: SlideShape) {
		return <rect width={shape.props.w} height={shape.props.h} />
	}
}

class SlideTool extends BaseBoxShapeTool {
	static override id = 'slide'
	static override initial = 'idle'
	override shapeType = 'slide'
}

function useSlides() {
	const editor = useEditor()
	return useValue<SlideShape[]>(
		'slide shapes',
		() => editor.getCurrentPageShapes().filter((s) => s.type === 'slide') as SlideShape[],
		[editor]
	)
}

function useCurrentSlide() {
	const editor = useEditor()
	const slides = useSlides()
	const nearest = useValue(
		'nearest slide',
		() => {
			const cameraBounds = editor.getViewportPageBounds()
			const nearest: { slide: SlideShape | null; distance: number } = {
				slide: null,
				distance: Infinity,
			}
			for (const slide of slides) {
				const bounds = editor.getShapePageBounds(slide.id)
				if (!bounds) continue
				const distance = Vec.Dist2(cameraBounds.center, bounds.center)
				if (distance < nearest.distance) {
					nearest.slide = slide
					nearest.distance = distance
				}
			}
			return nearest
		},
		[editor]
	)

	return nearest.slide
}

const SlideList = track(() => {
	const editor = useEditor()
	const slides = useSlides()
	const currentSlide = useCurrentSlide()

	if (slides.length === 0) return null
	return (
		<div
			style={{
				position: 'absolute',
				display: 'flex',
				flexDirection: 'column',
				gap: 4,
				top: 100,
				left: 8,
				padding: 4,
				backgroundColor: 'var(--color-low)',
				pointerEvents: 'all',
				borderRadius: 8,
			}}
			onPointerDown={(e) => stopEventPropagation(e)}
		>
			{slides.map((slide, i) => {
				return (
					<div
						key={slide.id + 'button'}
						style={{
							display: 'flex',
							gap: '4px',
							alignItems: 'center',
							borderRadius: 6,
						}}
					>
						<TldrawUiButton
							type="normal"
							style={{
								background: currentSlide?.id === slide.id ? '#f9fafb' : 'transparent',
								borderRadius: 6,
							}}
							onClick={() => {
								moveToSlide(editor, slide)
							}}
						>
							{`Slide ${i + 1}`}
						</TldrawUiButton>
						<TldrawUiButton type="normal" onClick={() => editor.deleteShape(slide.id)}>
							<TldrawUiButtonIcon icon="trash" />
						</TldrawUiButton>
					</div>
				)
			})}
		</div>
	)
})

const moveToSlide = (editor: Editor, slide: SlideShape) => {
	const bounds = editor.getShapePageBounds(slide.id)
	if (!bounds) return
	editor.zoomToBounds(bounds, { duration: 500, easing: EASINGS.easeInOutCubic, inset: 40 })
	// editor.setCamera(position, { duration: 200, easing: EASINGS.easeInOutQuad })
}

const SlidesExample = track(() => {
	return (
		<div className="tldraw__editor">
			<Tldraw
				persistenceKey="slideshow_example"
				shapeUtils={[SlideShapeUtil]}
				tools={[SlideTool]}
				components={{
					InFrontOfTheCanvas: SlideList,
				}}
				overrides={{
					tools(editor, tools) {
						// Create a tool item in the ui's context.
						tools.slide = {
							id: 'slide',
							icon: 'color',
							label: 'Slide',
							kbd: 's',
							onSelect: () => {
								editor.setCurrentTool('slide')
							},
						}
						return tools
					},
				}}
			/>
		</div>
	)
})

export default SlidesExample
