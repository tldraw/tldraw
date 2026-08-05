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

function getShadowOffsets(addExportDef: ReturnType<typeof makeCtx>['addExportDef']) {
	const filter = addExportDef.mock.calls[0][0].getElement() as ReactElement
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
			expect(addExportDef).toHaveBeenCalledTimes(1)
			const key = addExportDef.mock.calls[0][0].key as string
			expect(key).toBe('media-shadow-shape_abc')

			expect(behind!.type).toBe('rect')
			expect(props(behind)).toMatchObject({ width: 100, height: 80, filter: `url(#${key})` })
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
			expect(behind!.type).toBe('ellipse')
			expect(props(behind)).toMatchObject({ cx: 60, cy: 45, rx: 60, ry: 45 })
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
			const filter = addExportDef.mock.calls[0][0].getElement() as ReactElement
			expect(filter.type).toBe('filter')
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
			const filter = addExportDef.mock.calls[0][0].getElement() as ReactElement
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
				fill: 'hsl(0, 0%, 0%, 4.3%)',
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
			expect(props(front)).toMatchObject({ fill: 'hsl(0, 0%, 100%, 5%)' })
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
			expect(props(front)).toMatchObject({ fillRule: 'evenodd', fill: 'hsl(0, 0%, 0%, 4.3%)' })
		})
	})
})
