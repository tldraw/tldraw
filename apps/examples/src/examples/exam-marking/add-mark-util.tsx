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

	override component(shape: IExamMarkShape) {
		// eslint-disable-next-line react-hooks/rules-of-hooks
		const [score, setScore] = useState<number | string>(shape.props.score)

		return (
			<HTMLContainer id={shape.id} style={{ pointerEvents: 'all' }}>
				<div
					style={{
						// width: '100%',
						// height: '100%',
						fontSize: '1.5em',
						display: 'flex',
						flexDirection: 'column',
						alignItems: 'flex-start',
						gap: 12,
						background: 'white',
						border: '1px solid black',
						padding: 12,
					}}
				>
					<span>Question score:</span>
					<input
						type="number"
						value={score}
						style={{
							width: 120,
							fontSize: '1.25em',
							padding: '6px 10px',
							borderRadius: 4,
							border: '1px solid #ccc',
						}}
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
					/>
				</div>
			</HTMLContainer>
		)
	}

	override indicator(shape: IExamMarkShape) {
		return <rect width={shape.props.w} height={shape.props.h} />
	}

	override getDefaultProps(): IExamMarkShape['props'] {
		return {
			w: 160,
			h: 70,
			score: 0,
		}
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
		return true
	}
}
