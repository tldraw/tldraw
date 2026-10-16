import { DefaultColorStyle, DefaultFillStyle, GeoShapeGeoStyle, createShapeId } from 'tldraw'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createTestContext, type TestContext } from '../test/testContext'
import {
	OPACITY_STEPS,
	applyStyleValue,
	buildStyleRows,
	findStyleRowByKey,
	stepStyleValue,
	swatchColor,
} from './stylePanel'

describe('style rows', () => {
	let ctx: TestContext
	beforeEach(() => {
		ctx = createTestContext()
	})
	afterEach(() => ctx.dispose())

	function geo(x = 0) {
		const id = createShapeId()
		ctx.editor.createShape({ id, type: 'geo', x, y: 0, props: { w: 100, h: 100 } })
		return id
	}

	it('is empty in the select tool with nothing selected', () => {
		expect(buildStyleRows(ctx.editor)).toEqual([])
	})

	it('lists the shared styles of the selection in panel order, hiding legacy values', () => {
		ctx.editor.select(geo())
		const rows = buildStyleRows(ctx.editor)
		expect(rows.map((r) => r.id)).toEqual([
			'color',
			'opacity',
			'fill',
			'dash',
			'size',
			'font',
			'horizontalAlign',
			'verticalAlign',
			'geo',
			'labelColor',
		])
		const byId = Object.fromEntries(rows.map((r) => [r.id, r]))
		expect(byId.color.values).toHaveLength(12)
		expect(byId.color.values).not.toContain('white')
		expect(byId.color.isColor).toBe(true)
		expect(byId.color.current).toBe('black')
		expect(byId.dash.values).toEqual(['draw', 'solid', 'dashed', 'dotted'])
		expect(byId.horizontalAlign.values).toEqual(['start', 'middle', 'end'])
		expect(byId.horizontalAlign.label).toBe('align')
		expect(byId.geo.values).toEqual([...GeoShapeGeoStyle.values])
		expect(byId.opacity.values).toEqual(OPACITY_STEPS.map(String))
		expect(byId.opacity.display).toEqual(['10%', '25%', '50%', '75%', '100%'])
		expect(byId.fill.values).toEqual(['none', 'semi', 'solid', 'pattern', 'lined-fill', 'fill'])
		expect(byId.opacity.current).toBe('1')
		expect(byId.fill.jumpKey).toBe('f')
	})

	it('reports mixed values and the nearest opacity step', () => {
		const a = geo()
		const b = geo(200)
		ctx.editor.updateShape({ id: b, type: 'geo', opacity: 0.52, props: { color: 'red' } })
		ctx.editor.select(a, b)
		const rows = buildStyleRows(ctx.editor)
		expect(rows.find((r) => r.id === 'color')!.current).toBeNull()
		expect(rows.find((r) => r.id === 'opacity')!.current).toBeNull()
		ctx.editor.select(b)
		expect(buildStyleRows(ctx.editor).find((r) => r.id === 'opacity')!.current).toBe('0.5')
	})

	it('shows the next-shape styles of a drawing tool', () => {
		ctx.editor.setCurrentTool('arrow')
		const rows = buildStyleRows(ctx.editor)
		const ids = rows.map((r) => r.id)
		expect(ids).toContain('arrowheadStart')
		expect(ids).toContain('arrowheadEnd')
		expect(ids).toContain('arrowKind')
		expect(ids).not.toContain('geo')
		expect(rows.find((r) => r.id === 'arrowheadEnd')!.current).toBe('arrow')
		ctx.editor.setCurrentTool('line')
		expect(buildStyleRows(ctx.editor).map((r) => r.id)).toContain('spline')
	})

	it('applies to the selection and the next shapes and previews through isChangingStyle', () => {
		const id = geo()
		ctx.editor.select(id)
		const rows = buildStyleRows(ctx.editor)
		applyStyleValue(ctx.editor, rows.find((r) => r.id === 'fill')!, 'pattern')
		expect((ctx.editor.getShape(id)!.props as { fill: string }).fill).toBe('pattern')
		expect(ctx.editor.getStyleForNextShape(DefaultFillStyle)).toBe('pattern')
		// Like StylePanelContext: hides the selection indicator for a second so the change shows.
		expect(ctx.editor.getInstanceState().isChangingStyle).toBe(true)
		// Unknown values are ignored.
		applyStyleValue(ctx.editor, rows.find((r) => r.id === 'fill')!, 'nope')
		expect((ctx.editor.getShape(id)!.props as { fill: string }).fill).toBe('pattern')
		applyStyleValue(ctx.editor, rows.find((r) => r.id === 'opacity')!, '0.25')
		expect(ctx.editor.getShape(id)!.opacity).toBeCloseTo(0.25)
		expect(ctx.editor.getInstanceState().opacityForNextShape).toBeCloseTo(0.25)
	})

	it('only sets the next-shape style outside the select tool', () => {
		const id = geo()
		ctx.editor.select(id)
		ctx.editor.setCurrentTool('geo')
		const rows = buildStyleRows(ctx.editor)
		applyStyleValue(ctx.editor, rows.find((r) => r.id === 'color')!, 'blue')
		expect(ctx.editor.getStyleForNextShape(DefaultColorStyle)).toBe('blue')
		expect((ctx.editor.getShape(id)!.props as { color: string }).color).toBe('black')
	})

	it('steps through values with wrapping and from mixed', () => {
		const a = geo()
		const b = geo(200)
		ctx.editor.select(a)
		let size = buildStyleRows(ctx.editor).find((r) => r.id === 'size')!
		expect(size.current).toBe('m')
		stepStyleValue(ctx.editor, size, -1)
		stepStyleValue(ctx.editor, buildStyleRows(ctx.editor).find((r) => r.id === 'size')!, -1)
		expect((ctx.editor.getShape(a)!.props as { size: string }).size).toBe('xl')
		ctx.editor.select(a, b)
		size = buildStyleRows(ctx.editor).find((r) => r.id === 'size')!
		expect(size.current).toBeNull()
		stepStyleValue(ctx.editor, size, 1)
		expect((ctx.editor.getShape(a)!.props as { size: string }).size).toBe('s')
		expect((ctx.editor.getShape(b)!.props as { size: string }).size).toBe('s')
	})

	it('resolves swatch colours from the theme and jumps rows by key', () => {
		ctx.editor.select(geo())
		expect(swatchColor(ctx.editor, 'blue')).toBe(0x4465e9)
		expect(swatchColor(ctx.editor, 'black')).toBe(0x1d1d1d)
		expect(swatchColor(ctx.editor, '#ff0000')).toBe(0xff0000)
		const rows = buildStyleRows(ctx.editor)
		expect(rows[findStyleRowByKey(rows, 'c')].id).toBe('color')
		expect(rows[findStyleRowByKey(rows, 'z')].id).toBe('size')
		expect(rows[findStyleRowByKey(rows, 'F')].id).toBe('font')
		expect(findStyleRowByKey(rows, 'q')).toBe(-1)
	})
})
