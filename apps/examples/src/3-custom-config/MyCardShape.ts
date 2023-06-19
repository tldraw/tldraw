import { TLBaseShape } from '@tldraw/tldraw'

// A type for our custom card shape
export type MyCardShape = TLBaseShape<
	'card',
	{
		w: number
		h: number
	}
>
