import { Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'

export default function FrameColorsExample() {
	return (
		<>
			<div className="tldraw__editor">
				<Tldraw persistenceKey="example" options={{ showFrameColors: true }}></Tldraw>
			</div>
		</>
	)
}
