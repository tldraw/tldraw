import { Tldraw, Vec, invLerp } from 'tldraw'
import 'tldraw/tldraw.css'
import { usePerformance } from '../hooks/usePerformance'

export default function Develop() {
	const performanceOverrides = usePerformance()
	return (
		<div className="tldraw__editor">
			<Tldraw
				overrides={[performanceOverrides]}
				persistenceKey="tldraw_example"
				onMount={(editor) => {
					;(window as any).app = editor
					;(window as any).editor = editor

					const original = editor.getShapePageTransform
					editor.getShapePageTransform = (shape) => {
						const result = original.call(editor, shape)
						const cameraCenter = editor.getViewportPageBounds().center
						const shapeCenter = result.applyToPoint(
							editor.getShapeGeometry(shape).getBounds().center
						)
						const distance = cameraCenter.dist(shapeCenter)
						const scale = invLerp(1000, 0, distance)

						const t = Vec.Sub(cameraCenter, shapeCenter).mul(1 / scale)

						return result.clone().scale(scale, scale) // .translate(t.x, t.y)
					}
				}}
			/>
		</div>
	)
}
