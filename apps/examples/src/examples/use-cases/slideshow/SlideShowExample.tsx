import { useEffect, useState } from 'react'
import { Editor, TLFrameShape, Tldraw, createShapeId, useEditor, useValue } from 'tldraw'
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

	// [1]
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

	// [2]
	useEffect(() => {
		if (!editor) return

		const ids = currentSlides.map((slide) => createShapeId(slide.id))

		editor.run(() => {
			for (let i = 0; i < currentSlides.length; i++) {
				const shapeId = ids[i]
				const slide = currentSlides[i]
				const shape = editor.getShape(shapeId)
				if (shape) {
					if (shape.x === slide.index * (SLIDE_SIZE.w + SLIDE_MARGIN)) continue

					// Renumber the frame unless the user has renamed it
					let name = (shape as TLFrameShape).props.name
					if (/Slide \d+/.test(name)) {
						name = `Slide ${slide.index + 1}`
					}

					editor.updateShape({
						id: shapeId,
						type: 'frame',
						x: slide.index * (SLIDE_SIZE.w + SLIDE_MARGIN),
						props: {
							name,
						},
					})
				} else {
					editor.createShape({
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

		// [3]
		const unsubs: (() => void)[] = []

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
	const editor = useEditor()
	const slides = useSlides()
	const currentSlides = useValue('slides', () => slides.getCurrentSlides(), [slides])
	const lowestIndex = currentSlides[0].index
	const highestIndex = currentSlides[currentSlides.length - 1].index

	// [4]
	return (
		<>
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
					onPointerDown={editor.markEventAsHandled}
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
				onPointerDown={editor.markEventAsHandled}
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
				onPointerDown={editor.markEventAsHandled}
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
	const editor = useEditor()

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
				onPointerDown={editor.markEventAsHandled}
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
				onPointerDown={editor.markEventAsHandled}
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

/*
[1]
Whenever the current slide changes, the camera constraints are re-pointed at that slide's
bounds with `contain` behavior and `fit-max` zoom, so the user can't pan or zoom away from
it, then the camera is animated there. `force: true` is needed because the constraints
would otherwise block the move.

[2]
The slide list is app state (see SlidesManager.tsx); each slide is mirrored on the canvas as
a frame shape whose id is derived from the slide id with `createShapeId(slide.id)`. When
slides are inserted, existing frames are shifted and renumbered.

[3]
Two before-change side effects keep the frames in place: any change to a slide frame other
than renaming it is rejected, and slide frames are removed from the selection and hover
state so they can't be picked up by the select tool.

[4]
The buttons for inserting slides are rendered in `OnTheCanvas`, so they are positioned in
page space between the frames. `markEventAsHandled` on pointer down stops the canvas from
treating the press as the start of a drag.
*/
