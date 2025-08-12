import { useEffect, useRef, useState } from 'react'
import {
	defaultAddFontsFromNode,
	defaultBindingUtils,
	defaultEditorAssetUrls,
	defaultShapeUtils,
	Editor,
	StateNode,
	tipTapDefaultExtensions,
	TLComponents,
	TldrawEditor,
	TldrawUiContextProvider,
	TLShape,
} from 'tldraw'

export function TldrawViewer({
	shapes,
	components = {},
}: {
	shapes: TLShape[]
	components?: TLComponents
}) {
	const [editor, setEditor] = useState<Editor | null>(null)
	const [isVisible, setIsVisible] = useState(false)
	const containerRef = useRef<HTMLDivElement>(null)

	// Hide the component if it's outside of the current scroll area
	useEffect(() => {
		const observer = new IntersectionObserver(
			([entry]) => {
				setIsVisible(entry.isIntersecting)
			},
			{ rootMargin: '200px', threshold: 0 }
		)

		const currentElement = containerRef.current
		if (currentElement) observer.observe(currentElement)

		return () => {
			if (currentElement) observer.unobserve(currentElement)
		}
	}, [])

	useEffect(() => {
		if (!editor || !isVisible) return
		editor.updateInstanceState({ isReadonly: false })
		editor.setCameraOptions({ isLocked: false })
		editor.deleteShapes(editor.getCurrentPageShapes())
		editor.createShapes(shapes)
		editor.updateInstanceState({ isReadonly: true })
		editor.selectAll()
		const bounds = editor.getSelectionPageBounds()
		if (bounds) {
			editor.zoomToBounds(bounds, { inset: 30 })
		}
		editor.selectNone()
		editor.setCameraOptions({ isLocked: true })
	}, [shapes, editor, isVisible])

	if (!isVisible) {
		return <div ref={containerRef} className="tldraw-viewer" />
	}

	return (
		<div ref={containerRef} className="tldraw-viewer">
			<TldrawUiContextProvider>
				<TldrawEditor
					autoFocus={false}
					components={components ?? {}}
					inferDarkMode={false}
					onMount={setEditor}
					shapeUtils={defaultShapeUtils}
					bindingUtils={defaultBindingUtils}
					tools={tools}
					textOptions={defaultTextOptions}
					assetUrls={defaultEditorAssetUrls}
					initialState="inspect"
				/>
			</TldrawUiContextProvider>
		</div>
	)
}

class InspectTool extends StateNode {
	static override id = 'inspect'
}

const tools = [InspectTool]

const defaultTextOptions = {
	tipTapConfig: {
		extensions: tipTapDefaultExtensions,
	},
	addFontsFromNode: defaultAddFontsFromNode,
}
