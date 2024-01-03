import { Tldraw, TLEditorComponents } from '@tldraw/tldraw'
import '@tldraw/tldraw/tldraw.css'

// There's a guide at the bottom of this file!

const components: TLEditorComponents = {
	Brush: function MyBrush({ brush }) {
		return (
			<svg className="tl-overlays__item">
				<rect
					className="tl-brush"
					stroke="red"
					fill="none"
					width={Math.max(1, brush.w)}
					height={Math.max(1, brush.h)}
					transform={`translate(${brush.x},${brush.y})`}
				/>
			</svg>
		)
	},
	Scribble: ({ scribble, opacity, color }) => {
		return (
			<svg className="tl-overlays__item">
				<polyline
					points={scribble.points.map((p) => `${p.x},${p.y}`).join(' ')}
					stroke={color ?? 'black'}
					opacity={opacity ?? '1'}
					fill="none"
				/>
			</svg>
		)
	},
	SnapLine: null,
}

export default function CustomComponentsExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw persistenceKey="custom-components-example" components={components} />
		</div>
	)
}

/* 
This example shows how to change the default components that tldraw uses on the canvas via the `components` prop.
Components include things like the background, the grid, handles, spinners etc. In this case we change the box 
that appears when drag-selecting shapes, and the scribble left behind when using the eraser and laser pointer.

*/
