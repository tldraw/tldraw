import { TldrawUiButton, stopEventPropagation, track, useEditor, useValue } from 'tldraw'
import { moveToSlide, useCurrentSlide, useSlides } from './useSlides'

export const SlidesPanel = track(() => {
	const editor = useEditor()
	const slides = useSlides()
	const currentSlide = useCurrentSlide()
	const selectedShapes = useValue('selected shapes', () => editor.getSelectedShapes(), [editor])

	if (slides.length === 0) return null
	return (
		<div className="slides-panel scroll-light" onPointerDown={(e) => stopEventPropagation(e)}>
			{slides.map((slide, i) => {
				const isSelected = selectedShapes.includes(slide)
				return (
					<TldrawUiButton
						key={'slides-panel-button:' + slide.id}
						type="normal"
						className="slides-panel-button"
						onClick={() => moveToSlide(editor, slide)}
						style={{
							background: currentSlide?.id === slide.id ? 'var(--color-background)' : 'transparent',
							outline: isSelected ? 'var(--color-selection-stroke) solid 1.5px' : 'none',
						}}
					>
						{`Slide ${i + 1}`}
					</TldrawUiButton>
				)
			})}
		</div>
	)
})
