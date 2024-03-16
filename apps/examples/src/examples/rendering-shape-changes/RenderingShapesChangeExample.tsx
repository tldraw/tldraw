import { useState } from 'react'
import { TLShape, Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'
import { useChangedShapesReactor } from './useRenderingShapesChange'

const components = {
	InFrontOfTheCanvas: () => {
		const [state, setState] = useState<{
			created: TLShape[]
			deleted: TLShape[]
			culled: TLShape[]
			restored: TLShape[]
		}>({
			created: [],
			deleted: [],
			culled: [],
			restored: [],
		})

		useChangedShapesReactor(setState)

		return (
			<div style={{ padding: 50 }}>
				<pre>{JSON.stringify(state, null, 2)}</pre>
			</div>
		)
	},
}

export default function RenderingShapesChangeExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw persistenceKey="example" components={components} />
		</div>
	)
}
