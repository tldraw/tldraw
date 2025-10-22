import { TLDefaultColorStyle, TLShape } from 'tldraw'

declare module '@tldraw/tlschema' {
	export interface GlobalShapePropsMap {
		card: { w: number; h: number; color: TLDefaultColorStyle }
	}
}

// A type for our custom card shape
export type ICardShape = TLShape<'card'>
