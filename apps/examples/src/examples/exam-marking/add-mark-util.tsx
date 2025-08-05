import { useState } from 'react'
import { HTMLContainer, RecordProps, Rectangle2d, ShapeUtil, T, TLBaseShape } from 'tldraw'

export type IExamMarkShape = TLBaseShape<
	'exam-mark',
	{
		w: number
		h: number
		score: number
	}
>

export class ExamMarkUtil extends ShapeUtil<IExamMarkShape> {
	static override type = 'exam-mark' as const
	static override props: RecordProps<IExamMarkShape> = {
		w: T.number,
		h: T.number,
		score: T.number,
	}

	override getDefaultProps(): IExamMarkShape['props'] {
		return {
			w: 90,
			h: 40,
			score: 0,
		}
	}

	// [1]
	override component(shape: IExamMarkShape) {
		// [a]
		// eslint-disable-next-line react-hooks/rules-of-hooks
		const [score, setScore] = useState<number | string>(shape.props.score)

		return (
			<HTMLContainer id={shape.id} style={{ pointerEvents: 'all' }}>
				<div
					style={{
						height: '100%',
						fontSize: '1.5em',
						display: 'flex',
						alignItems: 'center',
					}}
				>
					<div
						style={{
							width: 24,
							height: 24,
							padding: '0 6px',
							cursor: 'grab',
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							userSelect: 'none',
						}}
						title="Drag to move"
					>
						<span style={{ fontSize: '1.1em', color: '#888' }}>⠿</span>
					</div>
					<input
						type="number"
						value={score}
						style={{
							width: '100%',
							fontSize: '1.25em',
							padding: '6px 10px',
							borderRadius: 4,
							border: '1px solid blue',
							opacity: 0.7,
						}}
						// [b]
						onChange={(e) => {
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
						}}
						// [c]
						onPointerDown={(e) => e.stopPropagation()}
						onTouchStart={(e) => e.stopPropagation()}
						onTouchEnd={(e) => e.stopPropagation()}
					/>
				</div>
			</HTMLContainer>
		)
	}

	override indicator(shape: IExamMarkShape) {
		return <rect width={shape.props.w} height={shape.props.h} />
	}

	getGeometry(shape: IExamMarkShape) {
		return new Rectangle2d({
			width: shape.props.w,
			height: shape.props.h,
			isFilled: true,
		})
	}

	override canEdit(_shape: IExamMarkShape): boolean {
		return true
	}

	override canResize(_shape: IExamMarkShape): boolean {
		return false
	}
}

/* 
A utility class for the exam mark shape. This is where you define the shape's behavior, how it renders (its component and indicator), and how it handles different events. For more details on how to create a custom shape utility, check out the `custom-config` example.

[1]
Render method — the React component that will be rendered for the shape. It takes the shape as an argument. HTMLContainer is just a div that's being used to wrap the input.

 - [a] The important part of this shape utility is how it handles the score input. We know we want the ExamScoreLabel component to be able to access the score of the shape,so we want the score to be a prop for the shape. 
 Annoying: eslint sometimes thinks this is a class component, but it's not.

 - [b] We want to be able to edit the score of the shape, so we need to be able to update the shape's props. We do this by using the editor.updateShape method when we detect that the score is a number.

 - [c] We need to stop the pointer down event on the input.

For notes on the the other parts of this shape utility, check out the `custom-config` example.
*/
