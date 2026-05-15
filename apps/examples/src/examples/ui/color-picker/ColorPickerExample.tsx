import { Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'

export default function ColorPickerExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw persistenceKey="color-picker-example" />
		</div>
	)
}
