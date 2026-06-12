import { describe, expect, it } from 'vitest'
import { formatAnnotation } from './annotationPhrasing'
import { ReadAnnotation } from './readAnnotations'

function annotation(
	area: { x: number; y: number; w: number; h: number },
	text = 'make it blue'
): ReadAnnotation {
	return { text, area, shapeIds: [] }
}

/** A small area whose centre sits at the given normalized point. */
function areaAt(cx: number, cy: number) {
	return { x: cx - 0.05, y: cy - 0.05, w: 0.1, h: 0.1 }
}

describe('formatAnnotation', () => {
	it('phrases an annotated change as an instruction with its region', () => {
		expect(formatAnnotation(annotation(areaAt(0.1, 0.1)))).toBe(
			'Change the top left of the asset: make it blue.'
		)
	})

	it('flags an arrow without text rather than dropping it', () => {
		expect(formatAnnotation(annotation(areaAt(0.5, 0.5), ''))).toBe(
			'Something at the centre of the asset needs changing (an arrow points there, but no text was given).'
		)
	})

	it('names the region from the centre of the area, not its corner', () => {
		// The area's top-left corner is in the top-left ninth, but its centre is the
		// middle of the asset.
		const wide = { x: 0.1, y: 0.1, w: 0.8, h: 0.8 }
		expect(formatAnnotation(annotation(wide))).toContain('the centre of the asset')
	})

	describe('region naming across the 3×3 grid', () => {
		it.each([
			[0.1, 0.1, 'top left'],
			[0.5, 0.1, 'top centre'],
			[0.9, 0.1, 'top right'],
			[0.1, 0.5, 'left side'],
			[0.5, 0.5, 'centre'],
			[0.9, 0.5, 'right side'],
			[0.1, 0.9, 'bottom left'],
			[0.5, 0.9, 'bottom centre'],
			[0.9, 0.9, 'bottom right'],
		])('centre (%f, %f) is "%s"', (cx, cy, region) => {
			expect(formatAnnotation(annotation(areaAt(cx, cy)))).toContain(`the ${region} of the asset`)
		})
	})
})
