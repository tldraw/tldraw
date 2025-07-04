import { Tldraw } from 'tldraw'
import { NodeShapeUtil } from './NodeShapeUtil'
import { PointingPort } from './ports/state-nodes/PointingPort'

function App() {
	return (
		<div style={{ position: 'fixed', inset: 0 }}>
			<Tldraw
				shapeUtils={[NodeShapeUtil]}
				onMount={(editor) => {
					editor.createShape({ type: 'node', x: 200, y: 200 })
					editor.root.find('select').addChild(PointingPort)
				}}
			/>
		</div>
	)
}

export default App
