import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createShapeId } from '@tldraw/editor'
import { toRichText } from '@tldraw/tlschema'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createTuiEditor } from '../editor/createTuiEditor'
import { saveTldrFile } from '../file/tldrFile'
import { parseRenderArgs } from './cli'
import { runRender } from './render'

function io() {
	const out: Array<string | Uint8Array> = []
	const err: string[] = []
	return {
		out,
		err,
		io: {
			stdout: { isTTY: false, write: (d: string | Uint8Array) => out.push(d) },
			stderr: { write: (d: string) => err.push(d) },
		},
	}
}

function options(args: string[]) {
	const parsed = parseRenderArgs(args)
	if (!parsed.ok) throw new Error(parsed.error)
	return parsed.options
}

describe('tldraw-tui render', () => {
	let dir: string
	let file: string

	beforeAll(async () => {
		dir = await mkdtemp(join(tmpdir(), 'tui-render-'))
		file = join(dir, 'doc.tldr')
		const tui = createTuiEditor({ colorMode: 'light' })
		tui.editor.createShapes([
			{
				id: createShapeId('box'),
				type: 'geo',
				x: 0,
				y: 0,
				props: { w: 200, h: 100, richText: toRichText('Box') },
			},
			{ id: createShapeId('far'), type: 'geo', x: 2000, y: 0, props: { w: 100, h: 100 } },
		])
		const saved = await saveTldrFile(tui.editor, file)
		expect(saved.ok).toBe(true)
		tui.dispose()
	})
	afterAll(() => rm(dir, { recursive: true, force: true }))

	it('prints the zoomed-to-fit viewport as text by default', async () => {
		const t = io()
		expect(await runRender(options([file]), t.io)).toBe(0)
		const text = t.out.join('')
		// Fitting a 2100 px wide page into 100 columns shrinks the box until its label truncates.
		expect(text.match(/┌/g)?.length).toBe(2)
		expect(text.split('\n').length).toBeLessThanOrEqual(29)
	})

	it('centres and zooms the viewport on request', async () => {
		const t = io()
		await runRender(options([file, '--center', '2050,50', '--zoom', '1', '--size', '40x10']), t.io)
		const text = t.out.join('')
		expect(text).not.toContain('Box')
		expect(text).toContain('┌')
	})

	it('draws only the selection', async () => {
		const t = io()
		await runRender(options([file, '--scope', 'selection', '--select', 'box']), t.io)
		const lines = (t.out.join('') as string).split('\n').filter((l) => l.trim())
		expect(lines.every((l) => l.length < 40)).toBe(true)
		expect(lines.join('\n')).toContain('Box')
	})

	it('writes a PNG of the document', async () => {
		const out = join(dir, 'doc.png')
		const t = io()
		expect(await runRender(options([file, '--scope', 'document', '-o', out]), t.io)).toBe(0)
		const png = await readFile(out)
		expect(png.subarray(1, 4).toString()).toBe('PNG')
		// 2100 × 100 page units plus 16 px padding, at the default scale of 2.
		expect(png.readUInt32BE(16)).toBe((2100 + 32) * 2)
	})

	it('writes SVG to stdout with labels as text', async () => {
		const t = io()
		await runRender(options([file, '--format', 'svg', '--dark']), t.io)
		const svg = t.out.join('') as string
		expect(svg).toMatch(/<text[^>]*>Box<\/text>/)
		expect(svg).not.toContain('foreignObject')
	})

	it('reports unknown shapes, pages and files', async () => {
		let t = io()
		expect(await runRender(options([file, '--scope', 'selection', '--select', 'nope']), t.io)).toBe(
			1
		)
		expect(t.err.join('')).toContain('no shape shape:nope')
		t = io()
		expect(await runRender(options([file, '--page', 'Nope']), t.io)).toBe(1)
		expect(t.err.join('')).toContain('no page "Nope"')
		t = io()
		expect(await runRender(options([join(dir, 'missing.tldr')]), t.io)).toBe(1)
	})
})
