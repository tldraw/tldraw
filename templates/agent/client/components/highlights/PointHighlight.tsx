import { SVGContainer, VecModel, useEditor, useValue } from 'tldraw'

export interface PointHighlightProps {
	pagePoint: VecModel
	color: string
	generating: boolean
}

export function PointHighlight({ pagePoint, color, generating }: PointHighlightProps) {
	const editor = useEditor()
	const screenPoint = useValue('screenPoint', () => editor.pageToViewport(pagePoint), [])
	const r = 3
	return (
		<SVGContainer
			className={`context-highlight ${generating ? 'context-highlight-generating' : ''}`}
			style={{
				top: screenPoint.y - r,
				left: screenPoint.x - r,
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
