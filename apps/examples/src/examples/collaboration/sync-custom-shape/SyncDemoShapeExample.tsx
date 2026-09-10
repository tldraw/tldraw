import { useSyncDemo } from '@tldraw/sync'
import { Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'
import { CounterShapeTool, CounterShapeUtil } from './CounterShape'
import { components, uiOverrides } from './ui'

const customShapes = [CounterShapeUtil]
const customTools = [CounterShapeTool]

export default function SyncDemoShapeExample({ roomId }: { roomId: string }) {
	// The store needs the shape utils too, so it can validate and migrate counter shapes that arrive
	// from other clients.
	const store = useSyncDemo({ roomId, shapeUtils: customShapes })
	return (
		<div className="tldraw__editor">
			<Tldraw
				store={store}
				shapeUtils={customShapes}
				tools={customTools}
				overrides={uiOverrides}
				components={components}
				options={{ deepLinks: true }}
			/>
		</div>
	)
}
