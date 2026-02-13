import { SVGContainer, useEditor, useValue, VecModel } from 'tldraw'

export interface PointHighlightProps {
	pagePoint: VecModel
	color: string
	generating: boolean
}

export function PointHighlight({ pagePoint, color, generating }: PointHighlightProps) {
	const editor = useEditor()
	// Scale radius by 1/zoom to maintain constant visual size
	const r = useValue('radius', () => 3 / editor.getZoomLevel(), [editor])

	return (
		<SVGContainer
			className={`context-highlight ${generating ? 'context-highlight-generating' : ''}`}
			style={{
				top: pagePoint.y - r,
				left: pagePoint.x - r,
				width: r * 2,
				height: r * 2,
			}}
		>
			<circle
				cx={r}
				cy={r}
				r={r}
				stroke={color ? color : 'var(--color-selected)'}
				fill={color ? color : 'var(--color-selected)'}
			/>
		</SVGContainer>
	)
}
