import { useEditor, useValue } from 'tldraw'
import { Sketch, Sketchbook } from '../sketch'

// A canvas-bound component: it calls useEditor, so it only renders under the editor
// harness (it would throw in isolation). Reads live editor state to prove the editor
// is real and interactive — pan/zoom the canvas and the readout updates.
interface EditorProbeProps {
	label: string
}

function EditorProbe({ label }: EditorProbeProps) {
	const editor = useEditor()
	const shapes = useValue('shapes', () => editor.getCurrentPageShapeIds().size, [editor])
	const zoom = useValue('zoom', () => editor.getZoomLevel().toFixed(2), [editor])
	return (
		<div className="editor-probe">
			<strong>{label}</strong>
			<span>shapes: {shapes}</span>
			<span>zoom: {zoom}</span>
		</div>
	)
}

const sketchbook: Sketchbook<EditorProbeProps> = {
	title: 'Editor/Probe',
	component: EditorProbe,
	harness: 'editor',
}
export default sketchbook

export const Default: Sketch<EditorProbeProps> = { args: { label: 'live editor' } }
