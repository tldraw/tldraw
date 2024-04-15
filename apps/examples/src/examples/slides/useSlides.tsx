import { EASINGS, Editor, atom, useEditor, useValue } from 'tldraw'
import { SlideShape } from './SlideShapeUtil'

export const $currentSlide = atom<SlideShape | null>('current slide', null)

export function moveToSlide(editor: Editor, slide: SlideShape) {
	const bounds = editor.getShapePageBounds(slide.id)
	if (!bounds) return
	$currentSlide.set(slide)
	editor.selectNone()
	editor.zoomToBounds(bounds, { duration: 500, easing: EASINGS.easeInOutCubic, inset: 0 })
}

export function useSlides() {
	const editor = useEditor()
	return useValue<SlideShape[]>('slide shapes', () => getSlides(editor), [editor])
}

export function useCurrentSlide() {
	return useValue($currentSlide)
}

export function getSlides(editor: Editor) {
	return editor
		.getSortedChildIdsForParent(editor.getCurrentPageId())
		.map((id) => editor.getShape(id))
		.filter((s) => s?.type === 'slide') as SlideShape[]
}
