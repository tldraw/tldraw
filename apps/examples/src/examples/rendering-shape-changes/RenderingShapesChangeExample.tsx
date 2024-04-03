import { useCallback } from 'react'
import { TLShape, Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'
import { useChangedShapesReactor } from './useRenderingShapesChange'

const components = {
	InFrontOfTheCanvas: () => {
		const onShapesChanged = useCallback((info: { culled: TLShape[]; restored: TLShape[] }) => {
			// eslint-disable-next-line no-console
			for (const shape of info.culled) console.log('culled: ' + shape.id)
			// eslint-disable-next-line no-console
			for (const shape of info.restored) console.log('restored: ' + shape.id)
		}, [])

		useChangedShapesReactor(onShapesChanged)

		return null
	},
}

export default function RenderingShapesChangeExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw persistenceKey="example" components={components} />
		</div>
	)
}
