import { SvgExportContext } from '@tldraw/editor'
import { ReactElement } from 'react'
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

describe('getMediaBorderSvg', () => {
	it('returns nothing for `none`', () => {
		const { ctx, addExportDef } = makeCtx()
		const { behind, front } = getMediaBorderSvg({
			border: 'none',
			w: 100,
			h: 80,
			isCircle: false,
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
				idBase: 'shape:abc',
				ctx,
			})
			const filter = addExportDef.mock.calls[0][0].getElement() as ReactElement
			expect(filter.type).toBe('filter')
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
				idBase: 'shape:e',
				ctx,
			})
			expect(front!.type).toBe('path')
			expect(props(front)).toMatchObject({ fillRule: 'evenodd', fill: 'hsl(0, 0%, 0%, 4.3%)' })
		})
	})
})
