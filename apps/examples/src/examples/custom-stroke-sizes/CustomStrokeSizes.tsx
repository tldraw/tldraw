import { STROKE_SIZES, Tldraw } from 'tldraw'

// Mutate the built-in stroke sizes at runtime
STROKE_SIZES.s = 1
STROKE_SIZES.m = 2
STROKE_SIZES.l = 4
STROKE_SIZES.xl = 8

export default function StrokeSizesExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw />
		</div>
	)
}
