import { TLBaseShape, TLDefaultColorStyle } from 'tldraw'

declare module '@tldraw/tlschema' {
	export interface GlobalShapePropsMap {
		card: ICardShape
	}
}

// A type for our custom card shape
export type ICardShape = TLBaseShape<
	'card',
	{
		w: number
		h: number
		color: TLDefaultColorStyle
	}
>
