import { TLBoxUtil } from '@tldraw/tldraw'
import { ErrorShape } from './ErrorShape'

export class ErrorUtil extends TLBoxUtil<ErrorShape> {
	static override type = 'error'
	override type = 'error' as const

	defaultProps() {
		return { message: 'Error!', w: 100, h: 100 }
	}
	render(shape: ErrorShape) {
		throw new Error(shape.props.message)
	}
	indicator() {
		throw new Error(`Error shape indicator!`)
	}
}
