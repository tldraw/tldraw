import { FONT_SIZES, STROKE_SIZES, Tldraw } from 'tldraw'

// Mutate the built-in stroke sizes
STROKE_SIZES.s = 1
STROKE_SIZES.m = 2
STROKE_SIZES.l = 4
STROKE_SIZES.xl = 8

// Mutate the built-in font sizes
FONT_SIZES.s = 12
FONT_SIZES.m = 16
FONT_SIZES.l = 20
FONT_SIZES.xl = 24

export default function StrokeAndFontSizesExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw />
		</div>
	)
}
