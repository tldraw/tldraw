import { useEffect, useState } from 'react'
import { useEditor } from 'tldraw'
import { IExamMarkShape } from './add-mark-util'

export function ExamScoreLabel() {
	const editor = useEditor()

	const [score, setScore] = useState(0)

	// [1]
	useEffect(() => {
		const updateScore = () => {
			const shapeIds = editor.getCurrentPageShapeIds()
			const examMarks = Array.from(shapeIds).filter((id) => {
				const shape = editor.getShape(id)
				return shape?.type === 'exam-mark'
			})
			const newScore = examMarks.reduce((acc, id) => {
				const shape = editor.getShape(id)
				if (shape?.type === 'exam-mark') {
					return acc + ((shape as IExamMarkShape).props.score || 0)
				}
				return acc
			}, 0)
			setScore(newScore)
		}

		updateScore()

		const unlisten = editor.store.listen(updateScore, { scope: 'document' })

		return unlisten
	}, [editor])

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

/*

[1]
This is a simple widget that shows the total exam score. It's an example of how to use the editor
instance to compute a value that depends on the shapes on the page.

*/
