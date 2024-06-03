import { useEffect, useState } from 'react'
import {
	Editor,
	TLFrameShape,
	Tldraw,
	createShapeId,
	stopEventPropagation,
	transact,
	useValue,
} from 'tldraw'
import 'tldraw/tldraw.css'
import { SLIDE_MARGIN, SLIDE_SIZE, SlidesProvider, useSlides } from './SlidesManager'

export default function SlideShowExample() {
	return (
		<div className="tldraw__editor">
			<SlidesProvider>
				<InsideSlidesContext />
			</SlidesProvider>
		</div>
	)
}

function InsideSlidesContext() {
	const [editor, setEditor] = useState<Editor | null>(null)
	const slides = useSlides()

	const currentSlide = useValue('currentSlide', () => slides.getCurrentSlide(), [slides])

	useEffect(() => {
		if (!editor) return

		const nextBounds = {
			x: currentSlide.index * (SLIDE_SIZE.w + SLIDE_MARGIN),
			y: 0,
			w: SLIDE_SIZE.w,
			h: SLIDE_SIZE.h,
		}

		editor.setCameraOptions({
			constraints: {
				bounds: nextBounds,
				behavior: 'contain',
				initialZoom: 'fit-max',
				baseZoom: 'fit-max',
				origin: { x: 0.5, y: 0.5 },
				padding: { x: 50, y: 50 },
			},
		})

		editor.zoomToBounds(nextBounds, { force: true, animation: { duration: 500 } })
	}, [editor, currentSlide])

	const currentSlides = useValue('slides', () => slides.getCurrentSlides(), [slides])

	useEffect(() => {
		if (!editor) return

		const ids = currentSlides.map((slide) => createShapeId(slide.id))

		transact(() => {
			for (let i = 0; i < currentSlides.length; i++) {
				const shapeId = ids[i]
				const slide = currentSlides[i]
				const shape = editor.getShape(shapeId)
				if (shape) {
					if (shape.x === slide.index * (SLIDE_SIZE.w + SLIDE_MARGIN)) continue

					// if name is still Slide and number, e.g Slide 1, update it. Use regex to test

					const regex = /Slide \d+/
					let name = (shape as TLFrameShape).props.name
					if (regex.test((shape as TLFrameShape).props.name)) {
						name = `Slide ${slide.index + 1}`
					}

					editor.updateShape<TLFrameShape>({
						id: shapeId,
						type: 'frame',
						x: slide.index * (SLIDE_SIZE.w + SLIDE_MARGIN),
						props: {
							name,
						},
					})
				} else {
					editor.createShape<TLFrameShape>({
						id: shapeId,
						parentId: editor.getCurrentPageId(),
						type: 'frame',
						x: slide.index * (SLIDE_SIZE.w + SLIDE_MARGIN),
						y: 0,
						props: {
							name: `Slide ${slide.index + 1}`,
							w: SLIDE_SIZE.w,
							h: SLIDE_SIZE.h,
						},
					})
				}
			}
		})

		const unsubs = [] as (() => void)[]

		unsubs.push(
			editor.sideEffects.registerBeforeChangeHandler('shape', (prev, next) => {
				if (
					ids.includes(next.id) &&
					(next as TLFrameShape).props.name === (prev as TLFrameShape).props.name
				)
					return prev
				return next
			})
		)

		unsubs.push(
			editor.sideEffects.registerBeforeChangeHandler('instance_page_state', (prev, next) => {
				next.selectedShapeIds = next.selectedShapeIds.filter((id) => !ids.includes(id))
				if (next.hoveredShapeId && ids.includes(next.hoveredShapeId)) next.hoveredShapeId = null
				return next
			})
		)

		return () => {
			unsubs.forEach((fn) => fn())
		}
	}, [currentSlides, editor])

	const handleMount = (editor: Editor) => {
		setEditor(editor)
	}

	return <Tldraw onMount={handleMount} components={components} />
}

function Slides() {
	const slides = useSlides()
	const currentSlides = useValue('slides', () => slides.getCurrentSlides(), [slides])
	const lowestIndex = currentSlides[0].index
	const highestIndex = currentSlides[currentSlides.length - 1].index

	return (
		<>
			{/* {currentSlides.map((slide) => (
				<div
					key={slide.id}
					style={{
						position: 'absolute',
						top: 0,
						left: (SLIDE_SIZE.w + SLIDE_MARGIN) * slide.index,
						width: SLIDE_SIZE.w,
						height: SLIDE_SIZE.h,
						backgroundColor: 'white',
						border: '1px solid black',
						pointerEvents: 'all',
					}}
					onPointerDown={(e) => {
						if (slide.id !== slides.getCurrentSlideId()) {
							stopEventPropagation(e)
							slides.setCurrentSlide(slide.id)
						}
					}}
				/>
			))} */}
			{currentSlides.slice(0, -1).map((slide) => (
				<button
					key={slide.id + 'between'}
					style={{
						position: 'absolute',
						top: SLIDE_SIZE.h / 2,
						left: (slide.index + 1) * (SLIDE_SIZE.w + SLIDE_MARGIN) - (SLIDE_MARGIN + 40) / 2,
						width: 40,
						height: 40,
						pointerEvents: 'all',
					}}
					onPointerDown={stopEventPropagation}
					onClick={() => {
						const newSlide = slides.newSlide(slide.index + 1)
						slides.setCurrentSlide(newSlide.id)
					}}
				>
					|
				</button>
			))}
			<button
				style={{
					position: 'absolute',
					top: SLIDE_SIZE.h / 2,
					left: lowestIndex * (SLIDE_SIZE.w + SLIDE_MARGIN) - (40 + SLIDE_MARGIN * 0.1),
					width: 40,
					height: 40,
					pointerEvents: 'all',
				}}
				onPointerDown={stopEventPropagation}
				onClick={() => {
					const slide = slides.newSlide(lowestIndex - 1)
					slides.setCurrentSlide(slide.id)
				}}
			>
				{`+`}
			</button>
			<button
				style={{
					position: 'absolute',
					top: SLIDE_SIZE.h / 2,
					left: highestIndex * (SLIDE_SIZE.w + SLIDE_MARGIN) + (SLIDE_SIZE.w + SLIDE_MARGIN * 0.1),
					width: 40,
					height: 40,
					pointerEvents: 'all',
				}}
				onPointerDown={stopEventPropagation}
				onClick={() => {
					const slide = slides.newSlide(highestIndex + 1)
					slides.setCurrentSlide(slide.id)
				}}
			>
				{`+`}
			</button>
		</>
	)
}

function SlideControls() {
	const slides = useSlides()

	return (
		<>
			<button
				style={{
					pointerEvents: 'all',
					position: 'absolute',
					top: '50%',
					left: 0,
					width: 50,
					height: 50,
				}}
				onPointerDown={stopEventPropagation}
				onClick={() => slides.prevSlide()}
			>
				{`<`}
			</button>
			<button
				style={{
					pointerEvents: 'all',
					position: 'absolute',
					top: '50%',
					right: 0,
					width: 50,
					height: 50,
				}}
				onPointerDown={stopEventPropagation}
				onClick={() => slides.nextSlide()}
			>
				{`>`}
			</button>
		</>
	)
}

const components = {
	OnTheCanvas: Slides,
	InFrontOfTheCanvas: SlideControls,
}
