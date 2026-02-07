import { useCallback } from 'react'
import { Editor, Tldraw } from 'tldraw'
import { DICE_TYPE, DiceShapeUtil } from './dice/DiceShapeUtil'

const shapeUtils = [DiceShapeUtil]

function App() {
	const handleMount = useCallback((editor: Editor) => {
		;(window as any).editor = editor
		if (editor.getCurrentPageShapeIds().size > 0) return

		// Place two dice on the canvas to start
		editor.createShapes([
			{
				type: DICE_TYPE,
				x: 300,
				y: 300,
			},
			{
				type: DICE_TYPE,
				x: 460,
				y: 300,
			},
		])
	}, [])

	return (
		<div style={{ position: 'fixed', inset: 0 }}>
			<Tldraw shapeUtils={shapeUtils} onMount={handleMount} persistenceKey="tabletop" />
		</div>
	)
}

export default App
