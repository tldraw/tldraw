import { useEditor, useValue } from 'tldraw'
import { IExamMarkShape } from './add-mark-util'

// interface IExamMarkShape {
//     type: 'exam-mark'
//     props: {
//         score: number
//     }
// }

export function ExamScoreLabel() {
	const editor = useEditor()

	// Compute score reactively whenever shapes change
	const score = useValue(
		'examScore',
		() => {
			const shapeIds = editor.getCurrentPageShapeIds()
			const examMarks = Array.from(shapeIds).filter((id) => {
				const shape = editor.getShape(id)
				return shape?.type === 'exam-mark'
			})

			return examMarks.reduce((acc, id) => {
				const shape = editor.getShape(id)
				if (shape?.type === 'exam-mark') {
					return acc + ((shape as IExamMarkShape).props.score || 0)
				}
				return acc
			}, 0)
		},
		[editor]
	)

	return (
		<div
			style={{
				padding: '8px',
				background: '#f5f5f5',
				borderRadius: '6px',
				display: 'inline-block',
			}}
		>
			<p style={{ fontSize: '1.25em', margin: 0 }}>Total exam score: {score}</p>
		</div>
	)
}
