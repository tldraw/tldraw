import { SvgExportContext } from '@tldraw/editor'
import { Fragment, ReactElement } from 'react'
import { vi } from 'vitest'
import { getMediaBorderSvg } from './mediaBorder'

function makeCtx(colorMode: 'light' | 'dark' = 'light') {
	const addExportDef = vi.fn()
	const ctx = { addExportDef, colorMode } as unknown as SvgExportContext
	return { ctx, addExportDef }
}

function props(el: ReactElement | null) {
	return el?.props as Record<string, unknown>
}

// Flatten fragments to the primitives that `filter` actually treats as direct
// children (a `g` wrapper would be ignored).
function flattenPrimitives(filter: ReactElement) {
	const out: ReactElement[] = []
	const visit = (node: any) => {
		if (node == null || typeof node !== 'object') return
		if (Array.isArray(node)) return node.forEach(visit)
		if (node.type === Fragment) return visit(node.props.children)
		if (typeof node.type === 'string') out.push(node)
	}
	visit(props(filter).children)
	return out
}

function getDef(addExportDef: ReturnType<typeof makeCtx>['addExportDef'], key: string) {
	const call = addExportDef.mock.calls.find((c) => c[0].key === key)
	if (!call) throw new Error(`no export def registered for ${key}`)
	return call[0].getElement() as ReactElement
}

// Shadows come back wrapped in a masked `g` that keeps them from painting under
// the media; the tests below care about what's inside.
function unwrapShadow(behind: ReactElement | null) {
	expect(behind!.type).toBe('g')
	return props(behind).children as ReactElement
}

function getShadowOffsets(addExportDef: ReturnType<typeof makeCtx>['addExportDef']) {
	const filter = getDef(addExportDef, 'media-shadow-shape_abc')
	return flattenPrimitives(filter)
		.filter((el) => el.type === 'feOffset')
		.map((el) => {
			const { dx, dy } = props(el) as { dx: number; dy: number }
			// The trig leaves floating-point dust on whichever axis rounds to zero.
			return { dx: round(dx), dy: round(dy) }
		})
}

function round(n: number) {
	const rounded = Math.round(n * 1000) / 1000
	// Normalize -0, which `toEqual` reports as a mismatch against 0.
	return rounded === 0 ? 0 : rounded
}

describe('getMediaBorderSvg', () => {
	it('returns nothing for `none`', () => {
		const { ctx, addExportDef } = makeCtx()
		const { behind, front } = getMediaBorderSvg({
			border: 'none',
			w: 100,
			h: 80,
			isCircle: false,
			rotation: 0,
			idBase: 'shape:a',
			ctx,
		})
		expect(behind).toBeNull()
		expect(front).toBeNull()
		expect(addExportDef).not.toHaveBeenCalled()
	})

	describe('shadow', () => {
		it('registers a shadow filter and paints it behind a rect', () => {
			const { ctx, addExportDef } = makeCtx()
			const { behind, front } = getMediaBorderSvg({
				border: 'shadow',
				w: 100,
				h: 80,
				isCircle: false,
				rotation: 0,
				idBase: 'shape:abc',
				ctx,
			})

			expect(front).toBeNull()
			expect(addExportDef.mock.calls.map((c) => c[0].key as string)).toEqual([
				'media-shadow-shape_abc',
				'media-shadow-mask-shape_abc',
			])

			const shadow = unwrapShadow(behind)
			expect(shadow.type).toBe('rect')
			expect(props(shadow)).toMatchObject({
				width: 100,
				height: 80,
				filter: 'url(#media-shadow-shape_abc)',
			})
		})

		it('paints an ellipse behind for circle-cropped images', () => {
			const { ctx } = makeCtx()
			const { behind } = getMediaBorderSvg({
				border: 'shadow',
				w: 120,
				h: 90,
				isCircle: true,
				rotation: 0,
				idBase: 'shape:e',
				ctx,
			})
			const shadow = unwrapShadow(behind)
			expect(shadow.type).toBe('ellipse')
			expect(props(shadow)).toMatchObject({ cx: 60, cy: 45, rx: 60, ry: 45 })
		})

		it('registers a filter element that reproduces the box-shadow layers', () => {
			const { ctx, addExportDef } = makeCtx()
			getMediaBorderSvg({
				border: 'shadow',
				w: 100,
				h: 80,
				isCircle: false,
				rotation: 0,
				idBase: 'shape:abc',
				ctx,
			})
			expect(getDef(addExportDef, 'media-shadow-shape_abc').type).toBe('filter')
		})

		it('keeps filter primitives as direct children (never wrapped in a `g`)', () => {
			const { ctx, addExportDef } = makeCtx()
			getMediaBorderSvg({
				border: 'shadow',
				w: 100,
				h: 80,
				isCircle: false,
				rotation: 0,
				idBase: 'shape:abc',
				ctx,
			})
			const filter = getDef(addExportDef, 'media-shadow-shape_abc')
			const types = flattenPrimitives(filter).map((el) => el.type as string)

			expect(types).not.toContain('g')
			expect(types).toContain('feGaussianBlur')
			expect(types).toContain('feMerge')
		})

		it('offsets straight down for an unrotated shape', () => {
			const { ctx, addExportDef } = makeCtx()
			getMediaBorderSvg({
				border: 'shadow',
				w: 100,
				h: 80,
				isCircle: false,
				rotation: 0,
				idBase: 'shape:abc',
				ctx,
			})
			expect(getShadowOffsets(addExportDef)).toEqual([
				{ dx: 0, dy: 2 },
				{ dx: 0, dy: 3 },
			])
		})

		it('counter-rotates the offsets so the light stays overhead in page space', () => {
			const { ctx, addExportDef } = makeCtx()
			getMediaBorderSvg({
				border: 'shadow',
				w: 100,
				h: 80,
				isCircle: false,
				rotation: Math.PI / 2,
				idBase: 'shape:abc',
				ctx,
			})
			// The export group rotates the filter along with the shape, so a quarter
			// turn moves the straight-down offsets onto the local x axis.
			expect(getShadowOffsets(addExportDef)).toEqual([
				{ dx: 2, dy: 0 },
				{ dx: 3, dy: 0 },
			])
		})

		it('flips the offsets for a half-turn instead of pointing the shadow up', () => {
			const { ctx, addExportDef } = makeCtx()
			getMediaBorderSvg({
				border: 'shadow',
				w: 100,
				h: 80,
				isCircle: false,
				rotation: Math.PI,
				idBase: 'shape:abc',
				ctx,
			})
			expect(getShadowOffsets(addExportDef)).toEqual([
				{ dx: 0, dy: -2 },
				{ dx: 0, dy: -3 },
			])
		})
	})

	describe('shadow-hard', () => {
		it('paints an offset rect behind without registering a filter', () => {
			const { ctx, addExportDef } = makeCtx()
			const { behind, front } = getMediaBorderSvg({
				border: 'shadow-hard',
				w: 100,
				h: 80,
				isCircle: false,
				rotation: 0,
				idBase: 'shape:abc',
				ctx,
			})

			expect(front).toBeNull()
			const keys = addExportDef.mock.calls.map((c) => c[0].key as string)
			expect(keys).toEqual(['media-shadow-mask-shape_abc'])

			const shadow = unwrapShadow(behind)
			expect(shadow.type).toBe('rect')
			expect(props(shadow)).toMatchObject({ x: 6, y: 6, width: 100, height: 80 })
		})

		it('paints an offset ellipse behind for circle-cropped images', () => {
			const { ctx } = makeCtx()
			const { behind } = getMediaBorderSvg({
				border: 'shadow-hard',
				w: 120,
				h: 90,
				isCircle: true,
				rotation: 0,
				idBase: 'shape:e',
				ctx,
			})
			const shadow = unwrapShadow(behind)
			expect(shadow.type).toBe('ellipse')
			expect(props(shadow)).toMatchObject({ cx: 66, cy: 51, rx: 60, ry: 45 })
		})

		it('counter-rotates the offset so it falls the same way in page space', () => {
			const { ctx } = makeCtx()
			const { behind } = getMediaBorderSvg({
				border: 'shadow-hard',
				w: 100,
				h: 80,
				isCircle: false,
				rotation: Math.PI / 2,
				idBase: 'shape:abc',
				ctx,
			})
			// A quarter turn swings the down-right offset onto the local +x/-y axes,
			// which the export group's rotation then puts back down-right on the page.
			const { x, y } = props(unwrapShadow(behind)) as { x: number; y: number }
			expect({ x: round(x), y: round(y) }).toEqual({ x: 6, y: -6 })
		})
	})

	// On canvas a box-shadow is only painted outside the element's border box, so
	// an unmasked export would show shadow through transparent images.
	describe.each(['shadow', 'shadow-hard'] as const)('%s masking', (border) => {
		it('masks the media out of the shadow', () => {
			const { ctx, addExportDef } = makeCtx()
			const { behind } = getMediaBorderSvg({
				border,
				w: 100,
				h: 80,
				isCircle: false,
				rotation: 0,
				idBase: 'shape:abc',
				ctx,
			})
			expect(props(behind).mask).toBe('url(#media-shadow-mask-shape_abc)')

			const mask = getDef(addExportDef, 'media-shadow-mask-shape_abc')
			expect(mask.type).toBe('mask')
			const [visible, knockout] = props(mask).children as ReactElement[]
			// The visible area has to extend past the media on every side, so that
			// none of the shadow is cropped along with it.
			const { x, y, width, height } = props(visible) as Record<string, number>
			expect(props(visible).fill).toBe('white')
			expect({ left: x < 0, top: y < 0, right: x + width > 100, bottom: y + height > 80 }).toEqual({
				left: true,
				top: true,
				right: true,
				bottom: true,
			})
			expect(knockout.type).toBe('rect')
			expect(props(knockout)).toMatchObject({ fill: 'black', width: 100, height: 80 })
		})

		it('knocks out an ellipse for circle-cropped images', () => {
			const { ctx, addExportDef } = makeCtx()
			getMediaBorderSvg({
				border,
				w: 120,
				h: 90,
				isCircle: true,
				rotation: 0,
				idBase: 'shape:abc',
				ctx,
			})
			const mask = getDef(addExportDef, 'media-shadow-mask-shape_abc')
			const [, knockout] = props(mask).children as ReactElement[]
			expect(knockout.type).toBe('ellipse')
			expect(props(knockout)).toMatchObject({ cx: 60, cy: 45, rx: 60, ry: 45, fill: 'black' })
		})
	})

	describe('lined', () => {
		it('paints a filled 1px frame on top with the light-mode color', () => {
			const { ctx, addExportDef } = makeCtx('light')
			const { behind, front } = getMediaBorderSvg({
				border: 'lined',
				w: 100,
				h: 80,
				isCircle: false,
				rotation: 0,
				idBase: 'shape:a',
				ctx,
			})
			expect(behind).toBeNull()
			expect(addExportDef).not.toHaveBeenCalled()
			expect(front!.type).toBe('path')
			expect(props(front)).toMatchObject({
				fill: 'hsl(0, 0%, 0%, 10%)',
				fillRule: 'evenodd',
				shapeRendering: 'crispEdges',
				d: 'M-1 -1H101V81H-1Z M0 0H100V80H0Z',
			})
		})

		it('rounds fractional dimensions to whole pixels so all four edges stay crisp', () => {
			const { ctx } = makeCtx('light')
			const { front } = getMediaBorderSvg({
				border: 'lined',
				w: 100.4,
				h: 79.8,
				isCircle: false,
				rotation: 0,
				idBase: 'shape:a',
				ctx,
			})
			expect(props(front)).toMatchObject({ d: 'M-1 -1H101V81H-1Z M0 0H100V80H0Z' })
		})

		it.each([
			{ name: 'a quarter turn', rotation: Math.PI / 2, shapeRendering: 'crispEdges' },
			{ name: 'a half turn', rotation: Math.PI, shapeRendering: 'crispEdges' },
			// The export group rotates the frame with the shape, and an unaliased
			// frame stair-steps once it stops lining up with the pixel grid.
			{ name: 'an eighth turn', rotation: Math.PI / 4, shapeRendering: undefined },
		])('only skips anti-aliasing while the frame is axis-aligned: $name', (t) => {
			const { ctx } = makeCtx('light')
			const { front } = getMediaBorderSvg({
				border: 'lined',
				w: 100,
				h: 80,
				isCircle: false,
				rotation: t.rotation,
				idBase: 'shape:a',
				ctx,
			})
			expect(props(front).shapeRendering).toBe(t.shapeRendering)
		})

		it('uses the dark-mode color in dark mode', () => {
			const { ctx } = makeCtx('dark')
			const { front } = getMediaBorderSvg({
				border: 'lined',
				w: 100,
				h: 80,
				isCircle: false,
				rotation: 0,
				idBase: 'shape:a',
				ctx,
			})
			expect(props(front)).toMatchObject({ fill: 'hsl(0, 0%, 100%, 10%)' })
		})

		it('paints a filled ring for circle-cropped images', () => {
			const { ctx } = makeCtx()
			const { front } = getMediaBorderSvg({
				border: 'lined',
				w: 120,
				h: 90,
				isCircle: true,
				rotation: 0,
				idBase: 'shape:e',
				ctx,
			})
			expect(front!.type).toBe('path')
			expect(props(front)).toMatchObject({ fillRule: 'evenodd', fill: 'hsl(0, 0%, 0%, 10%)' })
		})
	})
})
