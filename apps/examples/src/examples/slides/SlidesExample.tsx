import {
	DefaultKeyboardShortcutsDialog,
	DefaultKeyboardShortcutsDialogContent,
	DefaultToolbar,
	DefaultToolbarContent,
	TLComponents,
	TLUiOverrides,
	Tldraw,
	TldrawUiMenuItem,
	track,
	useIsToolSelected,
	useTools,
} from 'tldraw'
import 'tldraw/tldraw.css'
import { SlideShapeTool } from './SlideShapeTool'
import { SlideShapeUtil } from './SlideShapeUtil'
import { $currentSlide, getSlides, moveToSlide } from './SlidesContext'
import { SlidesPanel } from './SlidesPanel'
import './slides.css'

const components: TLComponents = {
	HelperButtons: SlidesPanel,
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
				<TldrawUiMenuItem {...tools['slide']} />
				<DefaultKeyboardShortcutsDialogContent />
			</DefaultKeyboardShortcutsDialog>
		)
	},
}

const overrides: TLUiOverrides = {
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
					const nextSlide = slides[index + 1] ?? currentSlide ?? slides[0]
					if (nextSlide) {
						editor.stopCameraAnimation()
						moveToSlide(editor, nextSlide)
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
					const previousSlide = slides[index - 1] ?? currentSlide ?? slides[slides.length - 1]
					if (previousSlide) {
						editor.stopCameraAnimation()
						moveToSlide(editor, previousSlide)
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
			onSelect: () => editor.setCurrentTool('slide'),
		}
		return tools
	},
}

const SlidesExample = track(() => {
	return (
		<div className="tldraw__editor">
			<Tldraw
				persistenceKey="slideshow_example"
				shapeUtils={[SlideShapeUtil]}
				tools={[SlideShapeTool]}
				components={components}
				overrides={overrides}
			/>
		</div>
	)
})

export default SlidesExample
