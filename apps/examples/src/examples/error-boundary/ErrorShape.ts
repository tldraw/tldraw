import { BaseBoxShapeUtil, TLShape } from 'tldraw'

declare module '@tldraw/tlschema' {
	export interface GlobalShapePropsMap {
		error: { w: number; h: number }
	}
}

export type ErrorShape = TLShape<'error'>

export class ErrorShapeUtil extends BaseBoxShapeUtil<ErrorShape> {
	static override type = 'error' as const
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
