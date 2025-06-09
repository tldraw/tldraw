/* eslint-disable react-hooks/rules-of-hooks */
import { useState } from 'react'
import { EditableMathField, MathField, addStyles } from 'react-mathquill'
import {
	Geometry2d,
	HTMLContainer,
	RecordProps,
	Rectangle2d,
	ShapeUtil,
	T,
	TLBaseShape,
	TLResizeInfo,
	Tldraw,
	resizeBox,
	useQuickReactor,
} from 'tldraw'
import 'tldraw/tldraw.css'

addStyles()

// [1]
type MathShape = TLBaseShape<
	'math',
	{
		w: number
		h: number
		latex: string
	}
>

// [2]
export class MathShapeUtil extends ShapeUtil<MathShape> {
	// [a]
	static override type = 'math' as const
	static override props: RecordProps<MathShape> = {
		w: T.number,
		h: T.number,
		latex: T.string,
	}

	// [b]
	getDefaultProps(): MathShape['props'] {
		return {
			w: 200,
			h: 200,
			latex: '',
		}
	}

	// [c]
	override canEdit() {
		return true
	}
	override canResize() {
		return true
	}
	override isAspectRatioLocked() {
		return false
	}

	// [d]
	getGeometry(shape: MathShape): Geometry2d {
		return new Rectangle2d({
			width: shape.props.w,
			height: shape.props.h,
			isFilled: true,
		})
	}

	// [e]
	override onResize(shape: any, info: TLResizeInfo<any>) {
		return resizeBox(shape, info)
	}

	// [f]
	component(shape: MathShape) {
		const [field, setField] = useState<MathField | null>(null)
		const isEditing = this.editor.getEditingShapeId() === shape.id

		useQuickReactor(
			'focus on edit',
			() => {
				if (!field) return
				if (isEditing) {
					field.focus()
					field.select()
				}
			},
			[field, isEditing]
		)

		return (
			<HTMLContainer>
				<EditableMathField
					mathquillDidMount={(mathField) => {
						setField(mathField)
					}}
					style={{
						pointerEvents: isEditing ? 'all' : 'none',
						width: '100%',
						height: '100%',
						overflow: 'hidden',
						fontSize: '30px',
					}}
					latex={shape.props.latex}
					onPointerDown={(e) => {
						if (isEditing) e.stopPropagation()
					}}
					onChange={(mathField) => {
						this.editor.updateShape<MathShape>({
							id: shape.id,
							type: 'math',
							props: {
								latex: mathField.latex(),
							},
						})
					}}
				/>
			</HTMLContainer>
		)
	}

	// [g]
	indicator(shape: MathShape) {
		return <rect width={shape.props.w} height={shape.props.h} />
	}
}

// [3]
const mathShape = [MathShapeUtil]

export default function CustomShapeExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				persistenceKey="math-shape-example"
				shapeUtils={mathShape}
				onMount={(editor) => {
					const mathShapes = editor.getCurrentPageShapes().filter((shape) => shape.type === 'math')
					if (mathShapes.length > 0) return // Don't add a new shape if one already exists
					editor.createShape({ type: 'math', x: 100, y: 100 })
				}}
			/>
		</div>
	)
}
