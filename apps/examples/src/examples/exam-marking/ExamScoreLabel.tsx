import { useEditor, useValue } from 'tldraw'
import { IExamMarkShape } from './add-mark-util'

// [1]
export function ExamScoreLabel() {
	const editor = useEditor()

	const score = useValue(
		'score',
		() => {
			let score = 0
			for (const shape of editor.getCurrentPageShapes()) {
				if (!editor.isShapeOfType<IExamMarkShape>(shape, 'exam-mark')) continue
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
This is a simple widget that shows the total exam score. It's an example of how to use the editor instance to compute a value that depends on the shapes on the page.

[a]
We listen for changes to the document using the editor.store.listen method inside of a useEffect hook.

[b]
We define a function that calculates the score based on the shapes on the page. We filter all shapes on the current page to only include `exam-mark` shapes, and then access the score prop of each shape and add them all to get the total score.

*/
