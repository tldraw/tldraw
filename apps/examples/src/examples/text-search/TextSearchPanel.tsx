import { useCallback, useEffect, useRef, useState } from 'react'
import {
	EASINGS,
	Editor,
	TLShape,
	TldrawUiButton,
	stopEventPropagation,
	track,
	useEditor,
} from 'tldraw'
import { showSearch } from './TextSearchExample'

interface SearchResults {
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

export const TextSearchPanel = track(() => {
	const editor = useEditor()
	const currentPageShapes = editor.getCurrentPageShapes()
	const [results, setResults] = useState<SearchResults[]>([])
	const [searchText, setSearchText] = useState('')
	const inputRef = useRef<HTMLInputElement>(null)
	const isVisible = showSearch.get()

	const getResults = useCallback(() => {
		if (!searchText || searchText === '') {
			setResults([])
			return
		}
		setResults(editor.getShapesWithText(searchText))
	}, [searchText, editor])

	useEffect(() => {
		getResults()
	}, [currentPageShapes, getResults])

	useEffect(() => {
		if (isVisible) {
			setSearchText('')
			inputRef.current?.focus()
		}
	}, [isVisible])

	return !isVisible ? null : (
		<div
			className="slides-panel scroll-light"
			onPointerDown={(e) => stopEventPropagation(e)}
			onKeyDown={keyDown}
		>
			<input
				className="slides-input"
				ref={inputRef}
				onChange={(e) => setSearchText(e.target.value)}
			></input>
			{results.map((result) => {
				return (
					<TldrawUiButton
						key={'slides-panel-button:' + result.shape.id}
						type="normal"
						className="slides-panel-button"
						onClick={() => moveToShape(editor, result.shape)}
					>
						{result.text}
					</TldrawUiButton>
				)
			})}
		</div>
	)
})
