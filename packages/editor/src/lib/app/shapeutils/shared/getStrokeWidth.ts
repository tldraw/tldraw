import { TLSizeType } from '@tldraw/tlschema'

const STROKE_WIDTHS_FOR_SIZE: Record<TLSizeType, number> = {
	s: 2,
	m: 3.5,
	l: 5,
	xl: 10,
}

export function getStrokeWidth(size: TLSizeType) {
	return STROKE_WIDTHS_FOR_SIZE[size]
}
