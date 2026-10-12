import { useEffect, useRef, useState } from 'react'
import { atom, EASINGS, Editor, TLShape, TldrawUiButton, track, useEditor } from 'tldraw'

export const showSearch = atom('showSearch', false)

interface SearchResult {
	text: string
	shape: TLShape
}

// [1]
function getShapesWithText(editor: Editor, text: string): SearchResult[] {
	if (!text) return []
	const query = text.toLowerCase()
	const results: SearchResult[] = []
	for (const shape of editor.getCurrentPageShapes()) {
		const shapeText = editor.getShapeUtil(shape).getText(shape)
		if (shapeText?.toLowerCase().includes(query)) {
			results.push({ text: shapeText, shape })
		}
	}
	return results.sort((a, b) => a.text.localeCompare(b.text))
}

function moveToShape(editor: Editor, shape: TLShape) {
	editor.setSelectedShapes([shape.id])
	editor.zoomToSelection({
		animation: { duration: 500, easing: EASINGS.easeInOutCubic },
	})
}

function handleKeyDown(e: React.KeyboardEvent) {
	if (e.key === 'Escape') {
		showSearch.set(false)
	}
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

	// [2]
	const results = getShapesWithText(editor, searchText)
	return (
		<div
			className="text-search-panel scroll-light"
			onPointerDown={editor.markEventAsHandled}
			onKeyDown={handleKeyDown}
		>
			<input
				className="text-search-input"
				ref={inputRef}
				onChange={(e) => setSearchText(e.target.value)}
			/>
			{results.map((result) => (
				<TldrawUiButton
					key={result.shape.id}
					type="normal"
					className="text-search-panel-button"
					onClick={() => moveToShape(editor, result.shape)}
				>
					{result.text}
				</TldrawUiButton>
			))}
		</div>
	)
})

/*
[1]
Every shape util can report its text through `getText(shape)`. It returns `undefined` for shapes with
no text, so this works across geo, text, note, arrow, and any custom shape that implements it.

[2]
The component is wrapped in `track`, so calling `getShapesWithText` during render subscribes it to the
page's shapes. Results update live as text on the canvas changes, not just when the query changes.
*/
