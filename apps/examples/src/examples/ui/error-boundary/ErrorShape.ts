import { BaseBoxShapeUtil, TLShape } from 'tldraw'

const ERROR_TYPE = 'error'

declare module 'tldraw' {
	export interface TLGlobalShapePropsMap {
		[ERROR_TYPE]: { w: number; h: number }
	}
}

export type ErrorShape = TLShape<typeof ERROR_TYPE>

export class ErrorShapeUtil extends BaseBoxShapeUtil<ErrorShape> {
	static override type = ERROR_TYPE
	getDefaultProps() {
		return { w: 100, h: 100 }
	}
	component() {
		throw new Error('Error!')
	}
	indicator() {
		throw new Error('Error!')
	}
}
