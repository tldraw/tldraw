import { TLBaseShape, TLOpacityType } from '@tldraw/tldraw'

export type CardShape = TLBaseShape<
	'card',
	{
		opacity: TLOpacityType // necessary for all shapes at the moment, others can be whatever you want!
		w: number
		h: number
	}
>
