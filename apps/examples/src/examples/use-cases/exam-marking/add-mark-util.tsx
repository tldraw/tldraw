import { useEffect, useRef, useState } from 'react'
import { HTMLContainer, RecordProps, Rectangle2d, ShapeUtil, T, TLShape } from 'tldraw'

export const EXAM_MARK_WIDTH = 80
export const EXAM_MARK_HEIGHT = 40

const EXAM_MARK_TYPE = 'exam-mark'

declare module 'tldraw' {
	export interface TLGlobalShapePropsMap {
		[EXAM_MARK_TYPE]: {
			score: number
		}
	}
}

export type IExamMarkShape = TLShape<typeof EXAM_MARK_TYPE>

export const examMarkShapeDefaultProps: IExamMarkShape['props'] = {
	score: 0,
}

export class ExamMarkUtil extends ShapeUtil<IExamMarkShape> {
	static override type = EXAM_MARK_TYPE
	static override props: RecordProps<IExamMarkShape> = {
		score: T.number,
	}

	override getDefaultProps(): IExamMarkShape['props'] {
		return examMarkShapeDefaultProps
	}

	// [1]
	override canEdit(): boolean {
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
					type: EXAM_MARK_TYPE,
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

	override getIndicatorPath() {
		const path = new Path2D()
		path.rect(0, 0, EXAM_MARK_WIDTH, EXAM_MARK_HEIGHT)
		return path
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

	override canResize(): boolean {
		return false
	}
}

/*
See the custom-config example for the basics of a shape util. The notes below cover only
what is specific to this shape.

[1]
Making the shape editable means double-clicking it enters editing mode, which we read back
via `editor.getEditingShapeId()` and use to enable and focus the input.

[2]
The component is a plain `HTMLContainer` wrapping a number input.

 - [a] The input only receives pointer events while the shape is being edited, so a
   single click still selects and drags the shape.

 - [b] Local state holds the raw text of the input (which may be empty or "-" mid-edit);
   only valid numbers are written back to the shape's `score` prop.

 - [c] Newly created marks start in editing mode so the input is ready to type into.

 - [d] Focus and select the input whenever editing starts, whether from creation or a
   double-click.

 - [e] `editor.updateShape` writes the score into the store, which is what makes the total
   in `ExamScoreLabel` update.
*/
