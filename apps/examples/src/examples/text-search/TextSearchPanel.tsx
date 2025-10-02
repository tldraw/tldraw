import { useEffect, useRef, useState } from 'react'
import { EASINGS, Editor, TLShape, TldrawUiButton, track, useEditor } from 'tldraw'
import { showSearch } from './TextSearchExample'

interface SearchResult {
	text: string
	shape: TLShape
}

function moveToShape(editor: Editor, shape: TLShape) {
	const bounds = editor.getShapePageBounds(shape.id)
	if (!bounds) return
	editor.setSelectedShapes([shape.id])
	editor.zoomToSelection({
		animation: { duration: 500, easing: EASINGS.easeInOutCubic },
	})
}

function keyDown(e: React.KeyboardEvent) {
	if (e.key === 'Escape') {
		showSearch.set(false)
	}
}

function getShapesWithText(editor: Editor, text: string): SearchResult[] {
	if (!text || text.length === 0) return []
	const shapes = editor.getCurrentPageShapes()
	const result: SearchResult[] = []
	shapes.forEach((shape) => {
		const util = editor.getShapeUtil(shape)
		const shapeText = util.getText(shape)
		if (shapeText && shapeText.includes(text)) {
			result.push({ text: shapeText, shape })
		}
	})
	return result.sort((a, b) => a.text.localeCompare(b.text))
}

export const TextSearchPanel = track(() => {
	const editor = useEditor()
	const [searchText, setSearchText] = useState('')
	const inputRef = useRef<HTMLInputElement>(null)
	const isVisible = showSearch.get()

	useEffect(() => {
		if (isVisible) {
			setSearchText('')
			inputRef.current?.focus()
		}
	}, [isVisible])

	if (!isVisible) return null

	const results = getShapesWithText(editor, searchText)
	return (
		<div
			className="text-search-panel scroll-light"
			onPointerDown={editor.markEventAsHandled}
			onKeyDown={keyDown}
		>
			<input
				className="text-search-input"
				ref={inputRef}
				onChange={(e) => setSearchText(e.target.value)}
			></input>
			{results.map((result) => {
				return (
					<TldrawUiButton
						key={'text-search-panel-button:' + result.shape.id}
						type="normal"
						className="text-search-panel-button"
						onClick={() => moveToShape(editor, result.shape)}
					>
						{result.text}
					</TldrawUiButton>
				)
			})}
		</div>
	)
})
