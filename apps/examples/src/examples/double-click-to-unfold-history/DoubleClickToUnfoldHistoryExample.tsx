import { useEffect, useMemo, useReducer, useRef } from 'react'
import { TLComponents, Tldraw, useEditor } from 'tldraw'
import 'tldraw/tldraw.css'
import {
	HistoryState,
	createHistoryState,
	getFoldForShape,
	recordFold,
	startUnfold,
	tickUnfold,
} from './history'

// Shared mutable ref so components/children can access the same state
let sharedHistoryState: HistoryState | null = null

function FoldButton() {
	const editor = useEditor()
	const [, forceUpdate] = useReducer((x: number) => x + 1, 0)
	const historyState = sharedHistoryState!

	return (
		<div
			style={{
				position: 'absolute',
				top: 48,
				left: 8,
				display: 'flex',
				gap: 4,
				pointerEvents: 'all',
			}}
			onPointerDown={(e) => editor.markEventAsHandled(e)}
		>
			<button
				style={{
					padding: '4px 12px',
					borderRadius: 6,
					border: '1px solid #ccc',
					background: 'white',
					cursor: 'pointer',
					fontSize: 13,
				}}
				onClick={() => {
					const allShapes = editor.getCurrentPageShapes()
					const userShapes = allShapes.filter((s) => !historyState.foldShapeIds.has(s.id))
					console.log('Fold button clicked', {
						folds: historyState.folds.length,
						isAnimating: historyState.isAnimating,
						totalShapes: allShapes.length,
						userShapes: userShapes.length,
						foldShapeIds: historyState.foldShapeIds.size,
					})
					recordFold(editor, historyState)
					console.log('After recordFold', { folds: historyState.folds.length })
					forceUpdate()
				}}
			>
				Fold history ({historyState.folds.length})
			</button>
		</div>
	)
}

function HistoryEffect() {
	const editor = useEditor()
	const historyState = sharedHistoryState!

	useEffect(() => {
		// Run the unfold animation each tick
		const onTick = () => tickUnfold(editor, historyState)
		editor.on('tick', onTick)

		// Detect double-click on fold shapes: when the editor starts editing
		// a fold shape (because geo shapes are editable), cancel editing and
		// trigger the unfold animation instead.
		const cleanup = editor.sideEffects.registerAfterChangeHandler(
			'instance_page_state',
			(prev, next) => {
				if (prev.editingShapeId !== next.editingShapeId && next.editingShapeId) {
					const fold = getFoldForShape(historyState, next.editingShapeId)
					if (fold && !historyState.isAnimating) {
						requestAnimationFrame(() => {
							editor.setCurrentTool('select')
							startUnfold(editor, historyState, fold)
						})
					}
				}
			}
		)

		return () => {
			editor.off('tick', onTick)
			cleanup()
		}
	}, [editor, historyState])

	return null
}

export default function DoubleClickToUnfoldHistoryExample() {
	const historyStateRef = useRef(createHistoryState())
	sharedHistoryState = historyStateRef.current

	const components = useMemo<TLComponents>(
		() => ({
			InFrontOfTheCanvas: FoldButton,
		}),
		[]
	)

	return (
		<div className="tldraw__editor">
			<Tldraw components={components}>
				<HistoryEffect />
			</Tldraw>
		</div>
	)
}
