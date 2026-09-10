import { Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'
import { SnowStorm } from './SnowStorm'
import './snowstorm.css'

export default function SnowStormExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw persistenceKey="snowstorm-example">
				{/* Children of Tldraw render inside the editor container, above the canvas */}
				<SnowStorm />
			</Tldraw>
		</div>
	)
}
