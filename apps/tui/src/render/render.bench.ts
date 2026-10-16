import { createShapeId, toRichText } from '@tldraw/tlschema'
import { describe, test } from 'vitest'
import { Screen } from '../terminal/Screen'
import { TestContext, createTestContext } from '../test/testContext'
import { OverlayRenderOptions, renderOverlays } from './renderOverlays'
import { ShapeRenderCache, renderShapes } from './renderShapes'

const COLS = 200
const ROWS = 52
const WHITE = 0xffffff

interface Scene {
	ctx: TestContext
	screen: Screen
	opts: OverlayRenderOptions
}

/**
 * A grid of labelled 200 × 100 geo shapes at 250 × 150 px pitch. At zoom 0.25 the 200 × 50 cell
 * canvas shows 6400 × 3200 page px, so `cols × rows` of them are visible when they start at the
 * origin; `offscreenCount` more are placed far to the right (culled by tldraw, never rasterized).
 */
function buildScene(cols: number, rows: number, offscreenCount: number): Scene {
	const ctx = createTestContext({ cols: COLS, rows: ROWS })
	const editor = ctx.editor
	const shapes = []
	for (let i = 0; i < cols * rows; i++) {
		shapes.push({
			id: createShapeId(),
			type: 'geo' as const,
			x: (i % cols) * 250,
			y: Math.floor(i / cols) * 150,
			props: {
				w: 200,
				h: 100,
				geo: i % 7 === 0 ? ('ellipse' as const) : ('rectangle' as const),
				fill: i % 3 === 0 ? ('solid' as const) : ('none' as const),
				richText: toRichText(`Box ${i}`),
			},
		})
	}
	for (let i = 0; i < offscreenCount; i++) {
		shapes.push({
			id: createShapeId(),
			type: 'geo' as const,
			x: 20000 + (i % cols) * 250,
			y: Math.floor(i / cols) * 150,
			props: { w: 200, h: 100, richText: toRichText(`Far ${i}`) },
		})
	}
	editor.createShapes(shapes)
	editor.setCamera({ x: 0, y: 0, z: 0.25 })
	for (const id of editor.getCurrentPageShapeIds()) editor.getShapePageBounds(id)
	const screen = new Screen(COLS, ROWS, { background: WHITE })
	const opts: OverlayRenderOptions = {
		glyphs: ctx.glyphs,
		colorMode: 'light',
		stroke: 'braille',
		background: WHITE,
		editCaret: null,
		pointerCell: null,
		pointerMode: false,
		showCursorGlyph: false,
	}
	return { ctx, screen, opts }
}

function frame(scene: Scene, overlays: boolean) {
	const { ctx, screen, opts } = scene
	screen.clear()
	renderShapes(ctx.editor, screen, ctx.layout.canvas, opts)
	if (overlays) renderOverlays(ctx.editor, screen, ctx.layout.canvas, opts)
}

describe('renderShapes 200x50', () => {
	test('500 visible geo shapes, warm cache and after a camera move', async ({ bench }) => {
		const visible = buildScene(25, 20, 0)
		frame(visible, false)
		const half = buildScene(25, 20, 1500)
		frame(half, false)
		let pan = 0
		const panning = buildScene(25, 20, 0)
		frame(panning, false)
		const selected = buildScene(25, 20, 0)
		selected.ctx.editor.select(selected.ctx.editor.getCurrentPageShapesSorted()[0].id)
		frame(selected, true)
		const cold = buildScene(25, 20, 0)
		frame(cold, false)

		try {
			await bench.compare(
				bench('500 visible (cached polylines)', () => {
					frame(visible, false)
				}),
				bench('2000 shapes, 500 visible, 1500 culled', () => {
					frame(half, false)
				}),
				bench('500 visible while panning (cache misses)', () => {
					pan = (pan + 1) % 16
					panning.ctx.editor.setCamera({ x: -pan * 4, y: 0, z: 0.25 })
					frame(panning, false)
				}),
				bench('500 visible + overlays for one selected shape', () => {
					frame(selected, true)
				}),
				bench('500 visible with an empty polyline cache', () => {
					cold.screen.clear()
					renderShapes(cold.ctx.editor, cold.screen, cold.ctx.layout.canvas, {
						...cold.opts,
						cache: new ShapeRenderCache(),
					})
				})
			)
		} finally {
			visible.ctx.dispose()
			half.ctx.dispose()
			panning.ctx.dispose()
			selected.ctx.dispose()
			cold.ctx.dispose()
		}
	})
})
