import { useEditor, useValue } from 'tldraw'

export function Instructions() {
	const editor = useEditor()
	const hasShapes = useValue('hasShapes', () => editor.getCurrentPageShapeIds().size > 0, [editor])

	if (hasShapes) return null

	return (
		<div className="instructions">
			<h2 className="instructions__title">Welcome to make real</h2>
			<ol className="instructions__list">
				<li>Draw or sketch a UI on the canvas.</li>
				<li>Select your sketch.</li>
				<li>
					Click <strong>Make real</strong> to turn it into a working web page.
				</li>
			</ol>
		</div>
	)
}
