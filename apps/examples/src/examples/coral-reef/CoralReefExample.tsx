import { TLComponents, Tldraw, useEditor, useValue } from 'tldraw'
import 'tldraw/tldraw.css'
import { CoralDrawTool } from './CoralDrawTool'
import { CoralShapeUtil } from './CoralShapeUtil'
import './coral.css'

// [1]
function CoralToolPanel() {
	const editor = useEditor()
	const isActive = useValue(
		'is coral tool active',
		() => editor.getCurrentToolId() === 'coral-draw',
		[editor]
	)

	return (
		<div className="coral-reef-panel">
			<button
				data-active={isActive}
				onClick={() => {
					if (isActive) {
						editor.setCurrentTool('select')
					} else {
						editor.setCurrentTool('coral-draw')
					}
				}}
			>
				<span style={{ fontSize: 16 }}>&#x1F9CA;</span> Reef pen
			</button>
		</div>
	)
}

// [2]
const components: TLComponents = {
	SharePanel: CoralToolPanel,
}

export default function CoralReefExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				shapeUtils={[CoralShapeUtil]}
				tools={[CoralDrawTool]}
				components={components}
				onMount={(editor) => {
					// [3]
					editor.createShape({
						type: 'text',
						x: 100,
						y: 100,
						props: {
							richText: {
								type: 'doc',
								content: [
									{
										type: 'paragraph',
										content: [
											{
												type: 'text',
												text: 'Click "Reef pen" and draw a closed loop. Then drag the yellow handle to grow a coral reef!',
											},
										],
									},
								],
							},
						},
					})
				}}
			/>
		</div>
	)
}

/*
[1]
A small toolbar button that toggles the coral drawing tool.
We use useValue to reactively track the current tool state.

[2]
We inject the tool button into the SharePanel slot, which appears
in the top-right area of the editor UI.

[3]
On mount, we add a helpful instruction text shape. The richText format
is tldraw's internal rich text representation.
*/
