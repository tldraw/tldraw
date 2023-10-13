import { Tldraw } from '@tldraw/tldraw'
import '@tldraw/tldraw/tldraw.css'

export default function ForceBreakpointExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw persistenceKey="tldraw_example" minBreakpoint={0} maxBreakpoint={6} />
		</div>
	)
}
