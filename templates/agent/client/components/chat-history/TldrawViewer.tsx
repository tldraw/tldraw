import { useEffect, useRef, useState } from 'react'
import { Editor, TLComponents, Tldraw, TLShape } from 'tldraw'

function TldrawViewer({
	shapes,
	components = {},
}: {
	shapes: TLShape[]
	components?: TLComponents
}) {
	const [editor, setEditor] = useState<Editor | null>(null)
	const [isVisible, setIsVisible] = useState(false)
	const containerRef = useRef<HTMLDivElement>(null)

	// Intersection Observer to track visibility
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

	// Return null if component is not visible
	if (!isVisible) {
		return <div ref={containerRef} className="tldraw-viewer" />
	}

	return (
		<div ref={containerRef} className="tldraw-viewer">
			<Tldraw
				autoFocus={false}
				hideUi
				components={components ?? {}}
				inferDarkMode={false}
				onMount={setEditor}
			/>
		</div>
	)
}

export default TldrawViewer
