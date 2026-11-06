import { BaseBoxShapeUtil, HTMLContainer, T, TLShape } from 'tldraw'
import { GRADE_TYPE } from './classroomPermissions'

// A plugin shape type. Its permission rules (`grades` in classroomPermissions.ts) live beside the
// other layers of the chain, not in the shape util.

declare module 'tldraw' {
	export interface TLGlobalShapePropsMap {
		[GRADE_TYPE]: { w: number; h: number; studentId: string; text: string }
	}
}

export type GradeShape = TLShape<typeof GRADE_TYPE>

export class GradeShapeUtil extends BaseBoxShapeUtil<GradeShape> {
	static override type = GRADE_TYPE
	static override props = {
		w: T.positiveNumber,
		h: T.positiveNumber,
		studentId: T.string,
		text: T.string,
	}

	override getDefaultProps() {
		return { w: 200, h: 90, studentId: '', text: '' }
	}

	override component(shape: GradeShape) {
		return (
			<HTMLContainer className="permission-chain__grade">
				<div>Grade for {shape.props.studentId}</div>
				<strong>{shape.props.text}</strong>
			</HTMLContainer>
		)
	}

	override getIndicatorPath(shape: GradeShape) {
		const path = new Path2D()
		path.rect(0, 0, shape.props.w, shape.props.h)
		return path
	}
}
