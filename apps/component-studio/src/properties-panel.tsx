import { useEditor, useValue } from 'tldraw'
import { Controls } from './controls'
import { sketchesById } from './registry'
import { SketchShape } from './sketch-shape'

// A Figma-like properties panel: when a sketch instance is selected, it renders the
// same Controls as the studio, bound to that shape's args. Editing calls updateShape,
// so each instance is independently editable.
export function PropertiesPanel() {
	const editor = useEditor()
	const selected = useValue(
		'selected sketch',
		() => {
			const shape = editor.getOnlySelectedShape()
			return shape && shape.type === 'sketch' ? (shape as SketchShape) : null
		},
		[editor]
	)

	if (!selected) return null
	const loaded = sketchesById.get(selected.props.sketchId)
	if (!loaded) return null

	return (
		<div className="properties-panel">
			<div className="properties-panel__title">{selected.props.sketchId}</div>
			<Controls
				loaded={loaded}
				args={selected.props.args}
				onChange={(next) =>
					editor.updateShape<SketchShape>({
						id: selected.id,
						type: 'sketch',
						props: { args: next },
					})
				}
			/>
		</div>
	)
}
