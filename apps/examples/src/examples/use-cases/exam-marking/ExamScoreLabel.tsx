import { useEditor, useValue } from 'tldraw'

export function ExamScoreLabel() {
	const editor = useEditor()

	// [1]
	const score = useValue(
		'score',
		() => {
			let score = 0
			for (const shape of editor.getCurrentPageShapes()) {
				if (!editor.isShapeOfType(shape, 'exam-mark')) continue
				score += shape.props.score
			}
			return score
		},
		[editor]
	)

	return (
		<div
			style={{
				background: 'var(--tl-color-panel)',
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				padding: '0.5rem 1rem',
				borderRadius: '6px',
				margin: '6px 0px 0px 0px',
				borderWidth: '2px',
				borderStyle: 'solid',
				borderColor: 'var(--tl-color-background-contrast)',
				zIndex: 'var(--tl-layer-panels)',
			}}
		>
			<p style={{ fontSize: '1.25em', margin: 0 }}>Total exam score: {score}</p>
		</div>
	)
}

/*
[1]
`useValue` re-runs this computation whenever a shape it read changes, so the total tracks
every exam mark that is added, edited, or deleted with no manual subscription.
*/
