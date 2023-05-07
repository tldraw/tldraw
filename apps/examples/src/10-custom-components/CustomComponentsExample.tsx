import { Tldraw, TLEditorComponents } from '@tldraw/tldraw'
import '@tldraw/tldraw/editor.css'
import '@tldraw/tldraw/ui.css'

const components: Partial<TLEditorComponents> = {
	Brush: ({ brush }) => (
		<rect
			className="tl-brush"
			stroke="red"
			fill="none"
			width={Math.max(1, brush.w)}
			height={Math.max(1, brush.h)}
			transform={`translate(${brush.x},${brush.y})`}
		/>
	),
	Scribble: ({ scribble, opacity, color }) => {
		return (
			<polyline
				points={scribble.points.map((p) => `${p.x},${p.y}`).join(' ')}
				stroke={color ?? 'black'}
				opacity={opacity ?? '1'}
				fill="none"
			/>
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
