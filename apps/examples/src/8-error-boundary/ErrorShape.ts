import { BaseBoxShapeUtil, TLBaseShape } from '@tldraw/tldraw'

export type ErrorShape = TLBaseShape<'error', { w: number; h: number; message: string }>

export class ErrorShapeUtil extends BaseBoxShapeUtil<ErrorShape> {
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
