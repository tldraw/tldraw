import { Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'
import './glass-theme.css'

export default function GlassThemeExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw persistenceKey="glass-example" />
		</div>
	)
}
