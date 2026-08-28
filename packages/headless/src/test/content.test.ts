import {
	Editor,
	TLArrowBinding,
	TLArrowShape,
	TLAssetId,
	TLGeoShape,
	TLImageShape,
	TLShapeId,
	TLTextShape,
	createShapeId,
} from '@tldraw/editor'
import { renderPlaintextFromRichText } from 'tldraw/headless-defaults'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createHeadlessEditor } from '../lib/createHeadlessEditor'

const editors: Editor[] = []
function makeEditor(opts: Parameters<typeof createHeadlessEditor>[0] = {}) {
	const editor = createHeadlessEditor({ frameLoop: 'manual', ...opts })
	editors.push(editor)
	return editor
}

afterEach(() => {
	for (const editor of editors.splice(0)) editor.dispose()
})

/** Two geo shapes with an arrow bound to both, the core "connected diagram" copy unit. */
function makeBoundArrowTrio(editor: Editor) {
	const a = createShapeId('a')
	const b = createShapeId('b')
	const arrow = createShapeId('arrow')
	editor.createShapes<TLGeoShape>([
		{ id: a, type: 'geo', x: 0, y: 0, props: { w: 100, h: 100 } },
		{ id: b, type: 'geo', x: 400, y: 0, props: { w: 100, h: 100 } },
	])
	editor.createShape({ id: arrow, type: 'arrow', x: 0, y: 0 })
	editor.createBindings([
		{ type: 'arrow', fromId: arrow, toId: a, props: { terminal: 'start' } },
		{ type: 'arrow', fromId: arrow, toId: b, props: { terminal: 'end' } },
	])
	return { a, b, arrow }
}

describe('getContentFromCurrentPage', () => {
	it('returns undefined for an empty id list', () => {
		const editor = makeEditor()
		expect(editor.getContentFromCurrentPage([])).toBeUndefined()
	})

	it('captures shapes, root ids, and the bindings among the copied set', () => {
		const editor = makeEditor()
		const { a, b, arrow } = makeBoundArrowTrio(editor)

		const content = editor.getContentFromCurrentPage([a, b, arrow])!
		expect(new Set(content.shapes.map((s) => s.id))).toEqual(new Set([a, b, arrow]))
		expect(new Set(content.rootShapeIds)).toEqual(new Set([a, b, arrow]))
		expect(content.bindings).toHaveLength(2)
		expect(new Set(content.bindings!.map((binding) => binding.toId))).toEqual(new Set([a, b]))
		expect(content.assets).toEqual([])
	})

	it('includes descendants of a copied frame, keeping their parentage', () => {
		const editor = makeEditor()
		const frame = createShapeId('frame')
		const child = createShapeId('child')
		editor.createShape({ id: frame, type: 'frame', x: 0, y: 0, props: { w: 300, h: 200 } })
		editor.createShape({ id: child, type: 'geo', x: 20, y: 20, parentId: frame })

		const content = editor.getContentFromCurrentPage([frame])!
		expect(new Set(content.shapes.map((s) => s.id))).toEqual(new Set([frame, child]))
		// only the frame is a root; the child stays parented to it
		expect(content.rootShapeIds).toEqual([frame])
		expect(content.shapes.find((s) => s.id === child)!.parentId).toBe(frame)
	})

	it('exports a root shape plucked out of a group with page-space coordinates', () => {
		const editor = makeEditor()
		const a = createShapeId('a')
		const b = createShapeId('b')
		editor.createShapes<TLGeoShape>([
			{ id: a, type: 'geo', x: 300, y: 200, props: { w: 100, h: 100 } },
			{ id: b, type: 'geo', x: 600, y: 500, props: { w: 100, h: 100 } },
		])
		editor.groupShapes([a, b])
		// inside the group the shape's stored coords are group-local
		expect(editor.getShape(a)!.x).toBe(0)

		const content = editor.getContentFromCurrentPage([a])!
		const exported = content.shapes[0]
		// the exported root is re-anchored to the page: page coords, page parent
		expect(exported).toMatchObject({ id: a, x: 300, y: 200 })
		expect(exported.parentId).toBe(editor.getCurrentPageId())
	})

	it('drops bindings to shapes outside the set, freezing the arrow terminal in place', () => {
		const editor = makeEditor()
		const { b, arrow } = makeBoundArrowTrio(editor)

		const content = editor.getContentFromCurrentPage([arrow, b])!
		// the start binding pointed at `a`, which was not copied — it is dropped...
		expect(content.bindings).toHaveLength(1)
		expect(content.bindings![0].toId).toBe(b)
		// ...and the copied arrow's start terminal is materialized where the arrow visually
		// left the shape — the clipped intersection with `a`'s right edge, not `a`'s center
		const copiedArrow = content.shapes.find((s) => s.id === arrow) as TLArrowShape
		expect(copiedArrow.props.start).toEqual({ x: 100, y: 50 })
		// the live arrow in the store is untouched: still bound at both ends
		expect(editor.getBindingsFromShape(arrow, 'arrow')).toHaveLength(2)
	})

	it('carries assets referenced by copied shapes', () => {
		const editor = makeEditor()
		const assetId = 'asset:img' as TLAssetId
		editor.createAssets([
			{
				id: assetId,
				typeName: 'asset',
				type: 'image',
				props: {
					src: 'https://example.com/x.png',
					w: 10,
					h: 10,
					name: 'x.png',
					isAnimated: false,
					mimeType: 'image/png',
					fileSize: 4,
				},
				meta: {},
			},
		])
		const image = createShapeId('image')
		editor.createShape<TLImageShape>({
			id: image,
			type: 'image',
			x: 0,
			y: 0,
			props: { w: 10, h: 10, assetId },
		})

		const content = editor.getContentFromCurrentPage([image])!
		expect(content.assets.map((a) => a.id)).toEqual([assetId])
	})
})

describe('putContentOntoCurrentPage', () => {
	it('pastes copies under fresh ids by default, leaving the originals alone', () => {
		const editor = makeEditor()
		const id = createShapeId()
		editor.createShape<TLGeoShape>({ id, type: 'geo', x: 10, y: 20, props: { w: 100, h: 100 } })

		const content = editor.getContentFromCurrentPage([id])!
		editor.putContentOntoCurrentPage(content)

		const shapes = editor.getCurrentPageShapes()
		expect(shapes).toHaveLength(2)
		const copy = shapes.find((s) => s.id !== id)!
		expect(copy.id).not.toBe(id)
		expect(editor.getShape(id)).toBeDefined()
		// nothing is selected unless select: true is passed
		expect(editor.getSelectedShapeIds()).toEqual([])
	})

	it('select: true selects the pasted root shapes', () => {
		const editor = makeEditor()
		const id = createShapeId()
		editor.createShape<TLGeoShape>({ id, type: 'geo', x: 0, y: 0, props: { w: 100, h: 100 } })

		editor.putContentOntoCurrentPage(editor.getContentFromCurrentPage([id])!, { select: true })
		const selected = editor.getSelectedShapeIds()
		expect(selected).toHaveLength(1)
		expect(selected[0]).not.toBe(id)
	})

	it('preserveIds: true keeps the original ids when pasting into a fresh editor', () => {
		const a = makeEditor()
		const { a: geoA, b: geoB, arrow } = makeBoundArrowTrio(a)
		const content = a.getContentFromCurrentPage([geoA, geoB, arrow])!

		const b = makeEditor()
		b.putContentOntoCurrentPage(content, { preserveIds: true, preservePosition: true })
		expect(new Set(b.getCurrentPageShapes().map((s) => s.id))).toEqual(new Set([geoA, geoB, arrow]))
		// binding ids and endpoints are preserved too
		expect(b.getBindingsFromShape(arrow, 'arrow')).toEqual(a.getBindingsFromShape(arrow, 'arrow'))
	})

	it('point centers the pasted content bounds on the given page point', () => {
		const editor = makeEditor()
		const id = createShapeId()
		editor.createShape<TLGeoShape>({ id, type: 'geo', x: 0, y: 0, props: { w: 100, h: 100 } })

		editor.putContentOntoCurrentPage(editor.getContentFromCurrentPage([id])!, {
			point: { x: 500, y: 300 },
			select: true,
		})
		const copyId = editor.getSelectedShapeIds()[0]
		// the point is the paste *center*, not the top-left
		expect(editor.getShapePageBounds(copyId)!.center).toMatchObject({ x: 500, y: 300 })
	})

	it('preservePosition keeps the original page coordinates', () => {
		const a = makeEditor()
		const id = createShapeId()
		a.createShape<TLGeoShape>({ id, type: 'geo', x: 5000, y: 6000, props: { w: 100, h: 100 } })
		const content = a.getContentFromCurrentPage([id])!

		const b = makeEditor()
		b.putContentOntoCurrentPage(content, { preservePosition: true })
		const pasted = b.getCurrentPageShapes()[0]
		expect(pasted).toMatchObject({ x: 5000, y: 6000 })
	})

	it('without point or preservePosition, keeps on-screen content in place but pulls offscreen content to the viewport center', () => {
		const a = makeEditor()
		const onscreen = createShapeId('on')
		const offscreen = createShapeId('off')
		a.createShapes<TLGeoShape>([
			{ id: onscreen, type: 'geo', x: 100, y: 100, props: { w: 100, h: 100 } },
			// far outside the default 1920x1080 viewport at camera (0, 0, 1)
			{ id: offscreen, type: 'geo', x: 10000, y: 10000, props: { w: 100, h: 100 } },
		])

		const b = makeEditor()
		b.putContentOntoCurrentPage(a.getContentFromCurrentPage([onscreen])!)
		// overlaps the viewport → stays exactly where it was
		expect(b.getCurrentPageShapes()[0]).toMatchObject({ x: 100, y: 100 })

		const c = makeEditor()
		c.putContentOntoCurrentPage(a.getContentFromCurrentPage([offscreen])!)
		// no viewport overlap → recentered on the viewport center (960, 540)
		expect(c.getShapePageBounds(c.getCurrentPageShapes()[0].id)!.center).toMatchObject({
			x: 960,
			y: 540,
		})
	})

	it('remaps binding endpoints onto the pasted copies', () => {
		const editor = makeEditor()
		const { a, b, arrow } = makeBoundArrowTrio(editor)
		const content = editor.getContentFromCurrentPage([a, b, arrow])!

		editor.putContentOntoCurrentPage(content, { select: true })
		const pastedArrow = editor
			.getSelectedShapes()
			.find((s): s is TLArrowShape => s.type === 'arrow')!
		expect(pastedArrow.id).not.toBe(arrow)

		const bindings = editor.getBindingsFromShape<TLArrowBinding>(pastedArrow, 'arrow')
		expect(bindings).toHaveLength(2)
		for (const binding of bindings) {
			expect(binding.fromId).toBe(pastedArrow.id)
			// endpoints point at the copies, never at the originals
			expect([a, b, arrow]).not.toContain(binding.toId)
			expect(editor.getSelectedShapeIds()).toContain(binding.toId)
		}
		// the originals keep their own two bindings
		expect(editor.getBindingsFromShape(arrow, 'arrow')).toHaveLength(2)
	})

	it('transfers a bound arrow pair and its assets into a different editor', () => {
		const a = makeEditor()
		const { a: geoA, b: geoB, arrow } = makeBoundArrowTrio(a)
		const assetId = 'asset:img' as TLAssetId
		a.createAssets([
			{
				id: assetId,
				typeName: 'asset',
				type: 'image',
				props: {
					src: 'https://example.com/x.png',
					w: 10,
					h: 10,
					name: 'x.png',
					isAnimated: false,
					mimeType: 'image/png',
					fileSize: 4,
				},
				meta: {},
			},
		])
		const image = createShapeId('image')
		a.createShape<TLImageShape>({
			id: image,
			type: 'image',
			x: 0,
			y: 200,
			props: { w: 10, h: 10, assetId },
		})

		const content = a.getContentFromCurrentPage([geoA, geoB, arrow, image])!

		const b = makeEditor()
		b.putContentOntoCurrentPage(content, { preservePosition: true })

		const pastedShapes = b.getCurrentPageShapes()
		expect(pastedShapes).toHaveLength(4)
		// same geometry in the receiving editor, keyed by type since ids are fresh
		const boundsByType = (editor: Editor, ids: TLShapeId[]) =>
			new Map(ids.map((id) => [editor.getShape(id)!.type, editor.getShapePageBounds(id)]))
		expect(
			boundsByType(
				b,
				pastedShapes.map((s) => s.id)
			)
		).toEqual(boundsByType(a, [geoA, geoB, arrow, image]))

		const pastedArrow = pastedShapes.find((s): s is TLArrowShape => s.type === 'arrow')!
		const bindings = b.getBindingsFromShape<TLArrowBinding>(pastedArrow, 'arrow')
		expect(bindings).toHaveLength(2)
		const pastedGeoIds = new Set(pastedShapes.filter((s) => s.type === 'geo').map((s) => s.id))
		expect(new Set(bindings.map((binding) => binding.toId))).toEqual(pastedGeoIds)

		// the asset record itself crossed over, under its original id
		const pastedImage = pastedShapes.find((s): s is TLImageShape => s.type === 'image')!
		expect(pastedImage.props.assetId).toBe(assetId)
		expect(b.getAsset(assetId)).toMatchObject({
			type: 'image',
			props: { src: 'https://example.com/x.png' },
		})
	})

	it('pasting the same content twice creates two independent copies', () => {
		const editor = makeEditor()
		const { a, b, arrow } = makeBoundArrowTrio(editor)
		const content = editor.getContentFromCurrentPage([a, b, arrow])!

		editor.putContentOntoCurrentPage(content)
		editor.putContentOntoCurrentPage(content)

		const shapes = editor.getCurrentPageShapes()
		expect(shapes).toHaveLength(9)
		// every paste minted fresh ids, so all nine are distinct records
		expect(new Set(shapes.map((s) => s.id)).size).toBe(9)
		// each of the three arrows is bound to its own pair of geos
		const arrows = shapes.filter((s) => s.type === 'arrow')
		const seenTargets = new Set<string>()
		for (const arrowShape of arrows) {
			const bindings = editor.getBindingsFromShape<TLArrowBinding>(arrowShape, 'arrow')
			expect(bindings).toHaveLength(2)
			for (const binding of bindings) seenTargets.add(binding.toId)
		}
		expect(seenTargets.size).toBe(6)
	})
})

describe('putExternalContent', () => {
	// The default external content handlers are registered by createHeadlessEditor, so the
	// paste/import surface works headlessly — an agent can put text or html on the canvas.
	it('creates a text shape from plain text content', async () => {
		const editor = makeEditor()
		await editor.putExternalContent({
			type: 'text',
			text: 'hello from outside',
			point: { x: 100, y: 100 },
		})
		const shapes = editor.getCurrentPageShapes()
		expect(shapes).toHaveLength(1)
		expect(shapes[0].type).toBe('text')
		expect(renderPlaintextFromRichText(editor, (shapes[0] as TLTextShape).props.richText)).toBe(
			'hello from outside'
		)
	})

	it('parses html content into rich text, preserving structure and marks', async () => {
		const editor = makeEditor()
		await editor.putExternalContent({
			type: 'text',
			text: 'one two',
			html: '<p>one <b>two</b></p><ul><li><p>three</p></li></ul>',
			point: { x: 0, y: 0 },
		})
		const shape = editor.getCurrentPageShapes()[0] as TLTextShape
		expect(renderPlaintextFromRichText(editor, shape.props.richText)).toBe('one two\nthree')
		// the bold mark survives the parse
		expect(JSON.stringify(shape.props.richText)).toContain('"bold"')
	})

	it('puts tldraw clipboard content onto the page', async () => {
		const a = makeEditor()
		const id = createShapeId()
		a.createShape<TLGeoShape>({ id, type: 'geo', x: 40, y: 50, props: { w: 120, h: 80 } })
		const content = a.getContentFromCurrentPage([id])!

		const b = makeEditor()
		await b.putExternalContent({ type: 'tldraw', content, point: { x: 500, y: 500 } })
		const pasted = b.getCurrentPageShapes()
		expect(pasted).toHaveLength(1)
		expect(b.getShapePageBounds(pasted[0].id)).toMatchObject({ w: 120, h: 80 })
	})

	it('imports excalidraw clipboard content', async () => {
		const editor = makeEditor()
		await editor.putExternalContent({
			type: 'excalidraw',
			content: {
				elements: [
					{
						type: 'rectangle',
						id: 'r1',
						x: 0,
						y: 0,
						width: 100,
						height: 50,
						angle: 0,
						strokeColor: '#000000',
						backgroundColor: 'transparent',
						fillStyle: 'solid',
						strokeWidth: 1,
						strokeStyle: 'solid',
						roundness: null,
						opacity: 100,
						groupIds: [],
						frameId: null,
						boundElements: null,
						seed: 1,
						version: 1,
						isDeleted: false,
					},
				],
				files: {},
			},
			point: { x: 0, y: 0 },
		})
		const shapes = editor.getCurrentPageShapes()
		expect(shapes).toHaveLength(1)
		expect(shapes[0].type).toBe('geo')
		expect(editor.getShapePageBounds(shapes[0].id)).toMatchObject({ w: 100, h: 50 })
	})

	it('unfurls url content into a bookmark with fetched metadata', async () => {
		// The headless url asset handler fetches with global fetch and parses with linkedom —
		// the default handler's DOMParser does not exist in Node.
		const realFetch = globalThis.fetch
		globalThis.fetch = (async () =>
			new Response(
				'<html><head><meta property="og:title" content="A title"><meta property="og:description" content="A description"></head></html>'
			)) as typeof fetch
		try {
			const editor = makeEditor()
			await editor.putExternalContent({
				type: 'url',
				url: 'https://example.com/page',
				point: { x: 0, y: 0 },
			})
			const shapes = editor.getCurrentPageShapes()
			expect(shapes).toHaveLength(1)
			expect(shapes[0].type).toBe('bookmark')
			// metadata hydration is fire-and-forget in the handler: the shape starts with a null
			// assetId and gets patched once the unfurl resolves — poll for it
			const shapeId = shapes[0].id
			const getAssetId = () => (editor.getShape(shapeId) as any).props.assetId as TLAssetId | null
			const start = Date.now()
			while (!getAssetId()) {
				if (Date.now() - start > 5000) break
				await new Promise((resolve) => setTimeout(resolve, 10))
			}
			expect(editor.getAsset(getAssetId()!)?.props).toMatchObject({
				title: 'A title',
				description: 'A description',
			})
		} finally {
			globalThis.fetch = realFetch
		}
	})

	it('still yields a plain bookmark when the url is unreachable', async () => {
		const realFetch = globalThis.fetch
		globalThis.fetch = (async () => {
			throw new Error('network down')
		}) as typeof fetch
		const error = vi.spyOn(console, 'error').mockImplementation(() => {})
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
		try {
			const editor = makeEditor()
			await editor.putExternalContent({
				type: 'url',
				url: 'https://unreachable.invalid/',
				point: { x: 0, y: 0 },
			})
			const shapes = editor.getCurrentPageShapes()
			expect(shapes).toHaveLength(1)
			expect(shapes[0].type).toBe('bookmark')
			const start = Date.now()
			while (error.mock.calls.length === 0) {
				if (Date.now() - start > 5000) break
				await new Promise((resolve) => setTimeout(resolve, 10))
			}
			// the failure degrades: error logged, `assets.url.failed` routed through the toast
			// shim as a translated console warning ('Couldn’t load URL preview'), bookmark kept
			expect(error).toHaveBeenCalled()
			expect(warn.mock.calls.some((call) => /URL preview/.test(String(call[0])))).toBe(true)
		} finally {
			error.mockRestore()
			warn.mockRestore()
			globalThis.fetch = realFetch
		}
	})

	it('rejects svg-text content with an actionable error', async () => {
		// The default handler would die deep inside svg sanitization with a bare
		// `DOMParser is not defined`; the headless override names the real limitation.
		const editor = makeEditor()
		await expect(
			editor.putExternalContent({
				type: 'svg-text',
				text: '<svg width="10" height="10"></svg>',
				point: { x: 0, y: 0 },
			})
		).rejects.toThrow(/not supported headlessly/)
	})

	it('reports file content as a translated console warning instead of importing', async () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
		try {
			const editor = makeEditor()
			await editor.putExternalContent({
				type: 'files',
				files: [new File([new Uint8Array([1, 2, 3])], 'x.txt', { type: 'text/plain' })],
				point: { x: 0, y: 0 },
			})
			expect(editor.getCurrentPageShapes()).toHaveLength(0)
			expect(warn).toHaveBeenCalled()
			// the toast shim maps ids through DEFAULT_TRANSLATION — no raw `assets.files.*` keys
			expect(warn.mock.calls.some((call) => /assets\.files/.test(String(call[0])))).toBe(false)
		} finally {
			warn.mockRestore()
		}
	})
})
