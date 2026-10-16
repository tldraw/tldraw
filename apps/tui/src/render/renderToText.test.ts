import { createShapeId, toRichText } from '@tldraw/tlschema'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { computeExportRequest, exportText } from '../file/tldrFile'
import { TestContext, createTestContext } from '../test/testContext'
import { createRenderToText } from './renderToText'

describe('createRenderToText', () => {
	let ctx: TestContext

	beforeEach(() => {
		ctx = createTestContext()
	})

	afterEach(() => {
		ctx.dispose()
	})

	it('exports the page as text with a padding cell around the content', () => {
		const editor = ctx.editor
		editor.createShape({
			type: 'geo',
			x: 1000,
			y: 1000,
			props: { w: 200, h: 100, richText: toRichText('Hello') },
		})
		const renderToText = createRenderToText({
			glyphs: ctx.glyphs,
			colorMode: 'light',
			stroke: 'braille',
		})
		const request = computeExportRequest(editor)!
		expect(request.cols).toBe(27)
		const text = renderToText(editor, request)
		const lines = text.split('\n')
		expect(lines.length).toBe(request.rows)
		expect(lines[0]).toBe('')
		expect(lines[1].indexOf('┌')).toBe(1)
		expect(lines[1].indexOf('┐')).toBe(26)
		expect(text).toContain('Hello')
		expect(exportText(editor, renderToText)).toBe(text)
	})

	it('exports every shape in the bounds regardless of the live viewport', () => {
		const editor = ctx.editor
		editor.createShapes([
			{ type: 'geo', x: 0, y: 0, props: { w: 160, h: 64 } },
			{ type: 'geo', x: 2400, y: 0, props: { w: 160, h: 64 } },
		])
		expect(editor.getCulledShapes().size).toBe(1)
		const renderToText = createRenderToText({
			glyphs: ctx.glyphs,
			colorMode: 'dark',
			stroke: 'blocks',
		})
		const request = computeExportRequest(editor, { maxCols: 400 })!
		const text = renderToText(editor, request)
		expect(text.split('┌').length - 1).toBe(2)
	})

	it('exports only the selection when asked', () => {
		const editor = ctx.editor
		const id = createShapeId()
		editor.createShapes([
			{ id, type: 'geo', x: 0, y: 0, props: { w: 160, h: 64, richText: toRichText('A') } },
			{ type: 'geo', x: 400, y: 0, props: { w: 160, h: 64, richText: toRichText('B') } },
		])
		editor.select(id)
		const renderToText = createRenderToText({
			glyphs: ctx.glyphs,
			colorMode: 'light',
			stroke: 'ascii',
		})
		const text = exportText(editor, renderToText, { selectionOnly: true })
		expect(text).toContain('A')
		expect(text).not.toContain('B')
	})
})
