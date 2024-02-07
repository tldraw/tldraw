import { Tldraw } from '@tldraw/tldraw'
import '@tldraw/tldraw/tldraw.css'

export default function InferDarkModeExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw inferDarkMode />
		</div>
	)
}
