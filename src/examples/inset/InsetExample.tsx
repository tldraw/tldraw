import { Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'

export default function InsetExample() {
	return (
		<div style={{ position: 'absolute', inset: 100 }}>
			<div className="tldraw__editor">
				<Tldraw />
			</div>
		</div>
	)
}
