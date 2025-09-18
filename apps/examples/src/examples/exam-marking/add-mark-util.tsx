import { useEffect, useRef, useState } from 'react'
import { HTMLContainer, RecordProps, Rectangle2d, ShapeUtil, T, TLBaseShape } from 'tldraw'

export const EXAM_MARK_WIDTH = 80
export const EXAM_MARK_HEIGHT = 40

export type IExamMarkShape = TLBaseShape<
	'exam-mark',
	{
		score: number
	}
>

export const examMarkShapeDefaultProps: IExamMarkShape['props'] = {
	score: 0,
}

export class ExamMarkUtil extends ShapeUtil<IExamMarkShape> {
	static override type = 'exam-mark' as const
	static override props: RecordProps<IExamMarkShape> = {
		score: T.number,
	}

	override getDefaultProps(): IExamMarkShape['props'] {
		return examMarkShapeDefaultProps
	}

	// [1]
	override canEdit(_shape: IExamMarkShape): boolean {
		return true
	}

	// [2]
	override component(shape: IExamMarkShape) {
		// [a]
		const isEditing = this.editor.getEditingShapeId() === shape.id

		// [b]
		/* eslint-disable react-hooks/rules-of-hooks */
		const [score, setScore] = useState<number | string>(shape.props.score)

		const inputRef = useRef<HTMLInputElement>(null)

		// [c]
		useEffect(() => {
			this.editor.setEditingShape(shape.id)
		}, [shape.id])

		// [d]
		useEffect(() => {
			if (isEditing && inputRef.current) {
				inputRef.current.focus()
				inputRef.current.select()
			}
		}, [isEditing])
		/* eslint-enable react-hooks/rules-of-hooks */

		// [e]
		const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
			const value = e.target.value
			setScore(value)
			const num = Number(value)
			if (!isNaN(num)) {
				this.editor.updateShape({
					id: shape.id,
					type: 'exam-mark',
					props: {
						score: num,
					},
				})
			}
		}

		return (
			<HTMLContainer id={shape.id}>
				<div
					style={{
						height: '100%',
						fontSize: '1.5em',
						display: 'flex',
						alignItems: 'center',
					}}
				>
					<input
						ref={inputRef}
						type="number"
						value={score}
						style={{
							width: '100%',
							fontSize: '1.25em',
							padding: '6px 10px',
							borderRadius: 4,
							border: '1px solid blue',
							opacity: 0.7,
							pointerEvents: isEditing ? 'all' : 'none',
						}}
						onChange={handleChange}
						onBlur={() => {
							this.editor.setEditingShape(null)
						}}
						onPointerDown={isEditing ? this.editor.markEventAsHandled : undefined}
						onPointerUp={isEditing ? this.editor.markEventAsHandled : undefined}
						onPointerMove={isEditing ? this.editor.markEventAsHandled : undefined}
					/>
				</div>
			</HTMLContainer>
		)
	}

	override indicator() {
		return <rect width={EXAM_MARK_WIDTH} height={EXAM_MARK_HEIGHT} rx={4} />
	}

	getGeometry() {
		return new Rectangle2d({
			width: EXAM_MARK_WIDTH,
			height: EXAM_MARK_HEIGHT,
			isFilled: true,
		})
	}

	override hideSelectionBoundsBg() {
		return true
	}
	override hideSelectionBoundsFg() {
		return true
	}

	override canResize(_shape: IExamMarkShape): boolean {
		return false
	}
}

/* 
A utility class for the exam mark shape. This is where you define the shape's behavior, how it renders (its component and indicator), and how it handles different events. For more details on how to create a custom shape utility, check out the `custom-config` example.

[1] We allow this component to be editable. This gives us some behavior for free, namely double clicking the shape will start editing the shape, which we can access using `editor.getEditingShapeId()`. With this, we can focus the input when the shape is double clicked. See [1][a] and [1][c] for more details.

[2] Render method — the React component that will be rendered for the shape. It takes the shape as an argument. HTMLContainer is just a div that's being used to wrap the input. 

 - [a] To control behavior, we need to know if the shape is being edited. We can access this using `editor.getEditingShapeId()`.

 - [b] The important part of this shape utility is how it handles the score input. We know we want the ExamScoreLabel component to be able to access the score of the shape, so we want the score to be a prop for the shape. 
 Annoying: eslint sometimes thinks this is a class component, but it's not.

 - [c] When the shape is mounted, we set it to be in editing mode.

 - [d] Focus the input when the the shape is being edited, i.e. when it's double clicked or when it's mounted. This means that when a shape is created, the text is immediately focused and selected.

 - [e] We want to be able to edit the score of the shape, so we need to be able to update the shape's props. We do this by using the editor.updateShape method when we detect that the score is a number.

For notes on the other parts of this shape utility, check out the `custom-config` example.
*/
