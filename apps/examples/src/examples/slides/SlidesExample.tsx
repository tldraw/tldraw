import { useCallback } from 'react'
import {
	BaseBoxShapeTool,
	DefaultKeyboardShortcutsDialog,
	DefaultKeyboardShortcutsDialogContent,
	DefaultToolbar,
	DefaultToolbarContent,
	EASINGS,
	Editor,
	Geometry2d,
	Rectangle2d,
	SVGContainer,
	ShapeProps,
	ShapeUtil,
	T,
	TLBaseShape,
	TLComponents,
	TLOnResizeHandler,
	Tldraw,
	TldrawUiButton,
	TldrawUiMenuItem,
	Vec,
	getPointerInfo,
	resizeBox,
	stopEventPropagation,
	track,
	useEditor,
	useIsToolSelected,
	useTools,
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
			name: `Slide`,
		}
	}

	// override onBeforeCreate = (next: SlideShape) => {
	// 	const slidesOnPage = this.editor.getCurrentPageShapes().filter((s) => s.type === 'slide')
	// 	next.props.name = `Slide ${slidesOnPage.length + 1}`
	// 	return next
	// }

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

		// eslint-disable-next-line react-hooks/rules-of-hooks
		const slides = useSlides()
		const index = slides.findIndex((s) => s.id === shape.id)

		// eslint-disable-next-line react-hooks/rules-of-hooks
		const handleLabelPointerDown = useCallback(
			(e: React.PointerEvent) => {
				const event = getPointerInfo(e)

				// If we're editing the frame label, we shouldn't hijack the pointer event
				if (this.editor.getEditingShapeId() === shape.id) return

				this.editor.dispatch({
					type: 'pointer',
					name: 'pointer_down',
					target: 'shape',
					shape: this.editor.getShape(shape.id)!,
					...event,
				})
				e.preventDefault()
			},
			[shape.id]
		)

		if (!bounds) return null

		return (
			<>
				<div
					onPointerDown={handleLabelPointerDown}
					style={{
						pointerEvents: 'all',
						position: 'absolute',
						background: 'var(--color-low)',
						padding: 'calc(12px * var(--tl-scale))',
						borderBottomRightRadius: 'calc(var(--radius-4) * var(--tl-scale))',
						fontSize: 'calc(12px * var(--tl-scale))',
						color: 'var(--color-text)',
						zIndex: 1,
						whiteSpace: 'nowrap',
					}}
				>
					{`${shape.props.name} ${index + 1}`}
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

class SlideTool extends BaseBoxShapeTool {
	static override id = 'slide'
	static override initial = 'idle'
	override shapeType = 'slide'
}

function useSlides() {
	const editor = useEditor()
	return useValue<SlideShape[]>(
		'slide shapes',
		() => {
			return editor
				.getSortedChildIdsForParent(editor.getCurrentPageId())
				.map((id) => editor.getShape(id))
				.filter((s) => s?.type === 'slide') as SlideShape[]
		},
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
		[editor, slides]
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
				position: 'fixed',
				display: 'flex',
				flexDirection: 'column',
				gap: 4,
				top: 100,
				maxHeight: 'calc(100vh - 200px)',
				left: 8,
				padding: 4,
				backgroundColor: 'var(--color-low)',
				pointerEvents: 'all',
				borderRadius: 8,
				overflow: 'scroll',
				// bottom: 100,
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
							{`${slide.props.name} ${i + 1}`}
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
	editor.zoomToBounds(bounds, { duration: 500, easing: EASINGS.easeInOutCubic, inset: 0 })
}

const components: TLComponents = {
	InFrontOfTheCanvas: SlideList,
	Toolbar: (props) => {
		const tools = useTools()
		const isSlideSelected = useIsToolSelected(tools['slide'])
		return (
			<DefaultToolbar {...props}>
				<TldrawUiMenuItem {...tools['slide']} isSelected={isSlideSelected} />
				<DefaultToolbarContent />
			</DefaultToolbar>
		)
	},
	KeyboardShortcutsDialog: (props) => {
		const tools = useTools()
		return (
			<DefaultKeyboardShortcutsDialog {...props}>
				<TldrawUiMenuItem {...tools['card']} />
				<DefaultKeyboardShortcutsDialogContent />
			</DefaultKeyboardShortcutsDialog>
		)
	},
}

const SlidesExample = track(() => {
	return (
		<div className="tldraw__editor">
			<Tldraw
				persistenceKey="slideshow_example"
				shapeUtils={[SlideShapeUtil]}
				tools={[SlideTool]}
				components={components}
				overrides={{
					tools(editor, tools) {
						// Create a tool item in the ui's context.
						tools.slide = {
							id: 'slide',
							icon: 'group',
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
