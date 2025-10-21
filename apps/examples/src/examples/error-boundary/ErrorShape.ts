import { BaseBoxShapeUtil, TLBaseShape } from 'tldraw'

declare module '@tldraw/tlschema' {
	export interface GlobalShapePropsMap {
		error: ErrorShape
	}
}

export type ErrorShape = TLBaseShape<'error', { w: number; h: number }>

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
