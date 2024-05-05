import { useEffect, useState } from 'react'
import { DEFAULT_CAMERA_OPTIONS, Editor, Tldraw, stopEventPropagation, useValue } from 'tldraw'
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

	const currentSlideIndex = useValue('currentSlideIndex', () => slides.getCurrentSlideIndex(), [
		slides,
	])

	useEffect(() => {
		if (!editor) return

		const nextBounds = {
			x: currentSlideIndex * (SLIDE_SIZE.w + SLIDE_MARGIN),
			y: 0,
			w: SLIDE_SIZE.w,
			h: SLIDE_SIZE.h,
		}

		editor.setCameraOptions({
			...DEFAULT_CAMERA_OPTIONS,
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
	}, [editor, currentSlideIndex])

	const handleMount = (editor: Editor) => {
		setEditor(editor)
	}

	return (
		<Tldraw
			persistenceKey="slideshow-example"
			onMount={handleMount}
			components={{
				OnTheCanvas: Slides,
				InFrontOfTheCanvas: SlideControls,
			}}
		/>
	)
}

function Slides() {
	const slides = useSlides()
	const currentSlides = useValue('slides', () => slides.getCurrentSlides(), [slides])

	return (
		<>
			{currentSlides.map((slide, index) => (
				<div
					key={slide.id}
					style={{
						position: 'absolute',
						top: 0,
						left: (SLIDE_SIZE.w + SLIDE_MARGIN) * index,
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
			))}
		</>
	)
}

function SlideControls() {
	const slides = useSlides()

	return (
		<>
			<button
				style={{ pointerEvents: 'all', position: 'absolute', top: '50%', left: 0 }}
				onPointerDown={stopEventPropagation}
				onClick={() => slides.prev()}
			>
				-
			</button>
			<button
				style={{ pointerEvents: 'all', position: 'absolute', top: '50%', right: 0 }}
				onPointerDown={stopEventPropagation}
				onClick={() => slides.next()}
			>
				+
			</button>
		</>
	)
}
