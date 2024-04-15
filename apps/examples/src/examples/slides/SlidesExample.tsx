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
	atom,
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
	}
>

class SlideShapeUtil extends ShapeUtil<SlideShape> {
	static override type = 'slide' as const
	static override props: ShapeProps<SlideShape> = {
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
						// zIndex: -1,
						whiteSpace: 'nowrap',
					}}
				>
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

class SlideTool extends BaseBoxShapeTool {
	static override id = 'slide'
	static override initial = 'idle'
	override shapeType = 'slide'
}

function useSlides() {
	const editor = useEditor()
	return useValue<SlideShape[]>('slide shapes', () => getSlides(editor), [editor])
}

function getSlides(editor: Editor) {
	return editor
		.getSortedChildIdsForParent(editor.getCurrentPageId())
		.map((id) => editor.getShape(id))
		.filter((s) => s?.type === 'slide') as SlideShape[]
}

const $currentSlide = atom<SlideShape | null>('current slide', null)

const SlideList = track(() => {
	const editor = useEditor()
	const slides = useSlides()
	const currentSlide = useValue($currentSlide)
	if (slides.length === 0) return null
	return (
		<div
			className="scroll-light"
			style={{
				display: 'flex',
				flexDirection: 'column',
				gap: 4,
				maxHeight: 'calc(100% - 60px - 50px)',
				margin: '50px 0px',
				padding: 4,
				backgroundColor: 'var(--color-low)',
				pointerEvents: 'all',
				borderTopRightRadius: 'var(--radius-4)',
				borderBottomRightRadius: 'var(--radius-4)',
				overflow: 'auto',
				borderRight: '2px solid var(--color-background)',
				borderBottom: '2px solid var(--color-background)',
				borderTop: '2px solid var(--color-background)',
			}}
			onPointerDown={(e) => stopEventPropagation(e)}
		>
			{slides.map((slide, i) => {
				const isSelected = editor.getSelectedShapes().includes(slide)
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
								borderRadius: 'var(--radius-4)',
								outline: isSelected ? 'var(--color-selection-stroke) solid 1.5px' : 'none',
								outlineOffset: '-1px',
							}}
							onClick={() => {
								moveToSlide(editor, slide)
							}}
						>
							{`Slide ${i + 1}`}
						</TldrawUiButton>
					</div>
				)
			})}
		</div>
	)
})

function moveToSlide(editor: Editor, slide: SlideShape) {
	const bounds = editor.getShapePageBounds(slide.id)
	if (!bounds) return
	$currentSlide.set(slide)
	editor.zoomToBounds(bounds, { duration: 500, easing: EASINGS.easeInOutCubic, inset: 0 })
}

const components: TLComponents = {
	HelperButtons: SlideList,
	Minimap: null,
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
					actions(editor, actions) {
						return {
							...actions,
							'next-slide': {
								id: 'next-slide',
								label: 'Next slide',
								kbd: 'right',
								onSelect() {
									if (editor.getSelectedShapeIds().length > 0) {
										editor.selectNone()
									}
									const slides = getSlides(editor)
									const currentSlide = $currentSlide.get()
									const index = slides.findIndex((s) => s.id === currentSlide?.id)
									const nextSlide = slides[index + 1]
									editor.stopCameraAnimation()
									if (nextSlide) {
										moveToSlide(editor, nextSlide)
									} else if (currentSlide) {
										moveToSlide(editor, currentSlide)
									} else if (slides.length > 0) {
										moveToSlide(editor, slides[0])
									}
								},
							},
							'previous-slide': {
								id: 'previous-slide',
								label: 'Previous slide',
								kbd: 'left',
								onSelect() {
									if (editor.getSelectedShapeIds().length > 0) {
										editor.selectNone()
									}
									const slides = getSlides(editor)
									const currentSlide = $currentSlide.get()
									const index = slides.findIndex((s) => s.id === currentSlide?.id)
									const previousSlide = slides[index - 1]
									editor.stopCameraAnimation()
									if (previousSlide) {
										moveToSlide(editor, previousSlide)
									} else if (currentSlide) {
										moveToSlide(editor, currentSlide)
									} else if (slides.length > 0) {
										moveToSlide(editor, slides[slides.length - 1])
									}
								},
							},
						}
					},
					tools(editor, tools) {
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
