import { DefaultSizeStyle, Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'

// Call this at module level, before any editor is created, so every editor
// (and every new shape) picks up the new default.
DefaultSizeStyle.setDefaultValue('s')

export default function ChangingDefaultStyleExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw persistenceKey="changing-default-style-example" />
		</div>
	)
}
