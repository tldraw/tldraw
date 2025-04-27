import { BaseBoxShapeUtil, TLBaseShape } from 'tldraw'

export type ErrorShape = TLBaseShape

export class ErrorShapeUtil extends BaseBoxShapeUtil {
	static override type = 'error' as const

	getDefaultProps() {
		return { message: 'Error!', w: 100, h: 100 }
	}
	component(shape: ErrorShape) {
		throw new Error(shape.props.message)
	}
	indicator() {
		throw new Error(`Error shape indicator!`)
	}
}
