import { once } from 'node:events'
import {
	Box,
	Editor,
	TLGeoShape,
	TLImageShape,
	createShapeId,
	createTLStore,
	getSnapshot,
} from '@tldraw/editor'
import { TLSocketRoom } from '@tldraw/sync-core'
import { TLRecord, createTLSchema } from '@tldraw/tlschema'
import { GeoShapeUtil } from 'tldraw'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { WebSocketServer } from 'ws'
import { connectHeadlessEditor } from '../lib/connectHeadlessEditor'
import { createHeadlessEditor } from '../lib/createHeadlessEditor'

const editors: Editor[] = []
function makeEditor(...args: Parameters<typeof createHeadlessEditor>) {
	const editor = createHeadlessEditor(...args)
	editors.push(editor)
	return editor
}

afterEach(() => {
	for (const editor of editors.splice(0)) editor.dispose()
})

describe('environment purity', () => {
	it('leaves globalThis DOM-free after a full sync session over real websockets', async () => {
		expect(typeof globalThis.document).toBe('undefined')
		expect(typeof (globalThis as any).window).toBe('undefined')

		const room = new TLSocketRoom<TLRecord, void>({ schema: createTLSchema() })
		const wss = new WebSocketServer({ port: 0 })
		wss.on('connection', (ws, req) => {
			const url = new URL(req.url!, 'http://localhost')
			room.handleSocketConnect({
				sessionId: url.searchParams.get('sessionId') ?? 'unknown',
				socket: ws,
			})
		})
		await once(wss, 'listening')
		const address = wss.address()
		if (typeof address === 'string' || address === null) throw new Error('expected a port')

		const editor = makeEditor()
		let connection: Awaited<ReturnType<typeof connectHeadlessEditor>> | undefined
		try {
			connection = await connectHeadlessEditor(editor, {
				uri: `ws://127.0.0.1:${address.port}`,
				userInfo: { name: 'Purity check' },
			})
			editor.createShape<TLGeoShape>({ id: createShapeId(), type: 'geo', x: 0, y: 0 })
			await connection.flush()
		} finally {
			// Close the client in the finally too: with the wss gone, an unclosed adapter
			// would reconnect-loop for the life of the worker.
			connection?.close()
			room.close()
			await new Promise<void>((resolve) => wss.close(() => resolve()))
		}

		// The ws transport, linkedom text shim, and sync client all ran — none of them may have
		// leaked a DOM onto globalThis, where it would flip environment detection process-wide.
		expect(typeof globalThis.document).toBe('undefined')
		expect(typeof (globalThis as any).window).toBe('undefined')
	}, 15_000)
})

describe('frame loop', () => {
	it("'auto' ticks while alive and stops after dispose", async () => {
		const editor = makeEditor()
		let ticks = 0
		editor.on('tick', () => ticks++)
		await new Promise((resolve) => setTimeout(resolve, 100))
		expect(ticks).toBeGreaterThan(0)

		editor.dispose()
		// dispose() removes all listeners, so re-register to observe any loop that survived it
		let postDisposeTicks = 0
		editor.on('tick', () => postDisposeTicks++)
		await new Promise((resolve) => setTimeout(resolve, 150))
		expect(postDisposeTicks).toBe(0)
	})

	it("'manual' mode: emitted ticks drive time-dependent behavior (camera animation)", () => {
		const editor = makeEditor({ frameLoop: 'manual' })
		editor.createShape<TLGeoShape>({
			id: createShapeId(),
			type: 'geo',
			x: 0,
			y: 0,
			props: { w: 100, h: 100 },
		})
		editor.setCamera({ x: -500, y: -600, z: 2 }, { animation: { duration: 200 } })

		// with no ticks the animation never advances — the camera is still at its start
		expect(editor.getCamera()).toMatchObject({ x: 0, y: 0, z: 1 })

		editor.emit('tick', 120)
		const midway = editor.getCamera()
		expect(midway.x).toBeLessThan(0)
		expect(midway.x).toBeGreaterThan(-500)

		// cumulative elapsed passes the duration: the animation completes exactly at the target
		editor.emit('tick', 120)
		expect(editor.getCamera()).toMatchObject({ x: -500, y: -600, z: 2 })
	})
})

describe('many editors', () => {
	it('10 concurrent editors have independent stores and selections', () => {
		const all = Array.from({ length: 10 }, () => makeEditor())
		const ids = all.map((editor, i) => {
			const id = createShapeId()
			editor.createShape<TLGeoShape>({ id, type: 'geo', x: i * 100, y: 0 })
			editor.select(id)
			return id
		})

		for (let i = 0; i < all.length; i++) {
			expect(all[i].getCurrentPageShapes().map((s) => s.id)).toEqual([ids[i]])
			expect(all[i].getSelectedShapeIds()).toEqual([ids[i]])
			expect(all[i].getShape(ids[(i + 1) % 10])).toBeUndefined()
		}
	})

	it('repeated create + dispose: every fresh editor starts clean, and no DOM leaks', () => {
		for (let i = 0; i < 10; i++) {
			// makeEditor, not a bare createHeadlessEditor: if an assertion fails mid-loop,
			// afterEach still disposes the stragglers instead of leaking live tick loops.
			const editor = makeEditor()
			expect(editor.getCurrentPageShapes()).toHaveLength(0)
			expect(editor.getCurrentToolId()).toBe('select')
			editor.createShape<TLGeoShape>({ id: createShapeId(), type: 'geo', x: 0, y: 0 })
			editor.dispose()
		}
		expect(typeof globalThis.document).toBe('undefined')
		expect(typeof (globalThis as any).window).toBe('undefined')
	})
})

describe('construction', () => {
	it('a bare Editor requires getContainer unless headless is passed explicitly', () => {
		// Headless must be declared, not inferred: a dropped or mistyped getContainer in a
		// browser app should fail loudly instead of silently running a non-rendering editor.
		const store = createTLStore({ shapeUtils: [], bindingUtils: [] })
		expect(() => new Editor({ store, shapeUtils: [], bindingUtils: [], tools: [] })).toThrow(
			/getContainer is required/
		)
	})

	it('refuses getContainer and headless together', () => {
		// A silent winner would either drop the export guard or ignore a real container.
		const store = createTLStore({ shapeUtils: [], bindingUtils: [] })
		expect(
			() =>
				new Editor({
					store,
					shapeUtils: [],
					bindingUtils: [],
					tools: [],
					getContainer: () => ({}) as HTMLElement,
					headless: true,
				})
		).toThrow(/mutually exclusive/)
	})

	it('a bare Editor with headless: true runs against the container stub', () => {
		const store = createTLStore({ shapeUtils: [], bindingUtils: [] })
		const editor = new Editor({
			store,
			shapeUtils: [],
			bindingUtils: [],
			tools: [],
			headless: true,
		})
		try {
			expect(editor.getInstanceState().insets).toEqual([false, false, false, false])
			expect(editor.getContainer()).toBeTruthy()
			expect(editor.textMeasure.injected).toBeTruthy()
		} finally {
			editor.dispose()
		}
	})
})

describe('license', () => {
	// Enforcement stands in for the browser watermark: headless renders nothing, so an
	// unlicensed production deployment would otherwise carry no signal at all.
	it('throws in production without a license key', () => {
		const prev = process.env.NODE_ENV
		process.env.NODE_ENV = 'production'
		try {
			expect(() => createHeadlessEditor()).toThrow(/requires a license/)
		} finally {
			process.env.NODE_ENV = prev
		}
	})

	it('reports an invalid license key as a console error in production', async () => {
		const error = vi.spyOn(console, 'error').mockImplementation(() => {})
		const prev = process.env.NODE_ENV
		process.env.NODE_ENV = 'production'
		try {
			// Validation is async, so an invalid key can't fail the constructor — the signal
			// is a console error once the license state resolves.
			makeEditor({ licenseKey: 'not-a-real-key' })
		} finally {
			process.env.NODE_ENV = prev
		}
		try {
			const sawLicenseError = () =>
				error.mock.calls.some((call) => /not licensed/.test(String(call[0])))
			const start = Date.now()
			while (!sawLicenseError()) {
				if (Date.now() - start > 5000) throw new Error('timed out waiting for license error')
				await new Promise((resolve) => setTimeout(resolve, 25))
			}
			expect(sawLicenseError()).toBe(true)
		} finally {
			error.mockRestore()
		}
	})

	it('allows keyless use outside production', () => {
		// NODE_ENV is 'test' here; the whole suite is the real assertion, this pins it
		expect(() => makeEditor()).not.toThrow()
	})

	it('reports an invalid license key as a console error outside production too', async () => {
		// The throw is production-gated; the validation error is not — a typo'd key in dev
		// should not pass silently.
		const error = vi.spyOn(console, 'error').mockImplementation(() => {})
		try {
			const editor = makeEditor({ licenseKey: 'not-a-real-key' })
			expect(editor.licenseManager).toBeTruthy()
			const sawLicenseError = () =>
				error.mock.calls.some((call) => /not licensed/.test(String(call[0])))
			const start = Date.now()
			while (!sawLicenseError()) {
				if (Date.now() - start > 5000) throw new Error('timed out waiting for license error')
				await new Promise((resolve) => setTimeout(resolve, 25))
			}
			expect(sawLicenseError()).toBe(true)
		} finally {
			error.mockRestore()
		}
	})
})

describe('dispose', () => {
	it('is idempotent — a second dispose() does not throw', () => {
		const editor = makeEditor()
		editor.dispose()
		expect(() => editor.dispose()).not.toThrow()
		expect(editor.isDisposed).toBe(true)
	})

	it('does not seal the store, but warns once when a disposed editor accepts writes', () => {
		// dispose() stops the tick loop and tears down managers, but the store itself stays
		// mutable (stores can legitimately outlive editors) — createShape after dispose still
		// lands. The error signal is a single console warning per editor.
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
		try {
			const editor = makeEditor()
			editor.dispose()
			const id = createShapeId()
			editor.createShape<TLGeoShape>({ id, type: 'geo', x: 5, y: 6 })
			expect(editor.getShape(id)).toBeDefined()
			editor.updateShape<TLGeoShape>({ id, type: 'geo', x: 50 })
			expect(warn).toHaveBeenCalledTimes(1)
			expect(warn.mock.calls[0][0]).toMatch(/disposed editor/)
		} finally {
			warn.mockRestore()
		}
	})

	it("calls a custom textMeasurer's dispose exactly once, even when disposed twice", () => {
		let disposals = 0
		const editor = makeEditor({
			textMeasurer: {
				measureText: () => ({ x: 0, y: 0, w: 10, h: 10, scrollWidth: 10 }),
				measureHtml: () => ({ x: 0, y: 0, w: 10, h: 10, scrollWidth: 10 }),
				measureHtmlBatch: (requests) =>
					requests.map(() => ({ x: 0, y: 0, w: 10, h: 10, scrollWidth: 10 })),
				measureTextSpans: (text) => [{ box: { x: 0, y: 0, w: 10, h: 10 }, text }],
				dispose: () => disposals++,
			},
		})
		editor.dispose()
		editor.dispose()
		expect(disposals).toBe(1)
	})
})

describe('options', () => {
	it('passes editorOptions through (maxShapesPerPage caps incremental creates)', () => {
		const editor = makeEditor({ editorOptions: { maxShapesPerPage: 5 } })
		expect(editor.options.maxShapesPerPage).toBe(5)

		let maxShapesEvents = 0
		editor.on('max-shapes', () => maxShapesEvents++)
		for (let i = 0; i < 8; i++) {
			editor.createShape<TLGeoShape>({ id: createShapeId(), type: 'geo', x: i * 10, y: 0 })
		}
		// creates beyond the cap are dropped without throwing, one 'max-shapes' event each; the
		// listener above is also what suppresses the console warning (pinned in the next test)
		expect(editor.getCurrentPageShapes()).toHaveLength(5)
		expect(maxShapesEvents).toBe(3)
	})

	it('drops a whole batch that would cross maxShapesPerPage, warning when nobody listens', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
		try {
			const editor = makeEditor({ editorOptions: { maxShapesPerPage: 5 } })
			editor.createShapes<TLGeoShape>(
				[0, 1, 2].map((i) => ({ id: createShapeId(), type: 'geo', x: i, y: 0 }))
			)
			// 3 + 4 > 5: none of the four are created — the batch is all-or-nothing. With no
			// 'max-shapes' listener registered (headless has no toast), a console warning is
			// the drop's only signal.
			editor.createShapes<TLGeoShape>(
				[0, 1, 2, 3].map((i) => ({ id: createShapeId(), type: 'geo', x: i, y: 100 }))
			)
			expect(editor.getCurrentPageShapes()).toHaveLength(3)
			expect(warn).toHaveBeenCalledTimes(1)
			expect(warn.mock.calls[0][0]).toMatch(/maxShapesPerPage/)
			// once per editor: a second overflowing call must not warn again
			editor.createShape<TLGeoShape>({ id: createShapeId(), type: 'geo', x: 0, y: 200 })
			editor.createShape<TLGeoShape>({ id: createShapeId(), type: 'geo', x: 0, y: 200 })
			editor.createShape<TLGeoShape>({ id: createShapeId(), type: 'geo', x: 0, y: 300 })
			expect(editor.getCurrentPageShapes()).toHaveLength(5)
			expect(warn).toHaveBeenCalledTimes(1)
		} finally {
			warn.mockRestore()
		}
	})

	it('does not warn about the shape cap when a max-shapes listener is registered', () => {
		// The listener is the browser toast's contract; deleting the listenerCount check in
		// alertMaxShapes would double-signal every app that already handles the event.
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
		try {
			const editor = makeEditor({ editorOptions: { maxShapesPerPage: 2 } })
			let events = 0
			editor.on('max-shapes', () => events++)
			for (let i = 0; i < 4; i++) {
				editor.createShape<TLGeoShape>({ id: createShapeId(), type: 'geo', x: i, y: 0 })
			}
			expect(editor.getCurrentPageShapes()).toHaveLength(2)
			expect(events).toBe(2)
			expect(warn).not.toHaveBeenCalled()
		} finally {
			warn.mockRestore()
		}
	})

	it('reflects the viewport option in getViewportScreenBounds', () => {
		const editor = makeEditor({ viewport: { width: 800, height: 600 } })
		expect(editor.getViewportScreenBounds()).toMatchObject({ x: 0, y: 0, w: 800, h: 600 })
	})

	it('accepts a later updateViewportScreenBounds', () => {
		const editor = makeEditor({ viewport: { width: 800, height: 600 } })
		editor.updateViewportScreenBounds(new Box(0, 0, 400, 300))
		expect(editor.getViewportScreenBounds()).toMatchObject({ w: 400, h: 300 })
	})

	it('supports camera operations headlessly (setCamera, zoomToFit)', () => {
		const editor = makeEditor()
		editor.setCamera({ x: 500, y: 600, z: 2 })
		expect(editor.getCamera()).toMatchObject({ x: 500, y: 600, z: 2 })

		editor.createShape<TLGeoShape>({
			id: createShapeId(),
			type: 'geo',
			x: 1000,
			y: 1000,
			props: { w: 100, h: 100 },
		})
		editor.zoomToFit()
		const bounds = editor.getViewportPageBounds()
		expect(bounds.contains(new Box(1000, 1000, 100, 100))).toBe(true)
	})

	// Camera-vs-undo behavior is pinned in history.test.ts ('camera moves are not undoable
	// and survive undo') — not duplicated here.

	it('loads the snapshot option before first use', () => {
		const source = makeEditor()
		const id = createShapeId()
		source.createShape<TLGeoShape>({ id, type: 'geo', x: 42, y: 24, props: { w: 100, h: 50 } })
		const pageId = source.getCurrentPageId()
		const snapshot = getSnapshot(source.store)

		const editor = makeEditor({ snapshot })
		// the very first reads see the snapshot's document and instance state, no extra step needed
		expect(editor.getCurrentPageId()).toBe(pageId)
		expect(editor.getShape(id)).toMatchObject({ x: 42, y: 24 })
		expect(editor.store.serialize('document')).toEqual(source.store.serialize('document'))
	})
})

describe('export headlessly', () => {
	// Pins the documented "export is browser-only" claim. The guard exists because without it
	// the export path died deep in react-dom with an error that read like a bundler bug.
	it('getSvgString rejects with a clear headless error', async () => {
		const editor = makeEditor({ frameLoop: 'manual' })
		const id = createShapeId()
		editor.createShape<TLGeoShape>({ id, type: 'geo', x: 0, y: 0 })
		await expect(editor.getSvgString([id])).rejects.toThrow(
			'Image and SVG export are not available in a headless editor'
		)
	})

	it('toImage rejects the same way — it goes through the SVG path first', async () => {
		const editor = makeEditor({ frameLoop: 'manual' })
		const id = createShapeId()
		editor.createShape<TLGeoShape>({ id, type: 'geo', x: 0, y: 0 })
		await expect(editor.toImage([id])).rejects.toThrow(
			'Image and SVG export are not available in a headless editor'
		)
	})
})

describe('registerDefaultSideEffects', () => {
	// createHeadlessEditor registers tldraw's registerDefaultSideEffects; this pins one of its
	// headlessly-observable effects: an instance_page_state.croppingShapeId change drives the
	// select tool into (and out of) its crop state, with no pointer input involved.
	it('croppingShapeId changes drive the select tool into and out of select.crop', () => {
		const editor = makeEditor({ frameLoop: 'manual' })
		const id = createShapeId()
		// an image shape, because canCrop is false for geo — setCroppingShape would no-op
		editor.createShape<TLImageShape>({ id, type: 'image', x: 0, y: 0, props: { w: 100, h: 100 } })
		expect(editor.getPath()).toBe('select.idle')

		editor.setCroppingShape(id)
		expect(editor.getCroppingShapeId()).toBe(id)
		expect(editor.getPath()).toBe('select.crop.idle')

		editor.setCroppingShape(null)
		expect(editor.getPath()).toBe('select.idle')
	})
})

describe('custom shape utils', () => {
	it('a custom util replacing a default type participates in behavior, not just install', () => {
		class StampingGeoShapeUtil extends GeoShapeUtil {
			static override type = 'geo' as const
			override onBeforeCreate(next: TLGeoShape): TLGeoShape {
				return { ...next, meta: { ...next.meta, stamped: true } }
			}
		}

		const editor = makeEditor({ shapeUtils: [StampingGeoShapeUtil], frameLoop: 'manual' })
		expect(editor.getShapeUtil('geo')).toBeInstanceOf(StampingGeoShapeUtil)

		const id = createShapeId()
		editor.createShape<TLGeoShape>({ id, type: 'geo', x: 0, y: 0, meta: { from: 'caller' } })
		// the override ran during creation and its result was stored
		expect(editor.getShape(id)!.meta).toEqual({ from: 'caller', stamped: true })
	})
})
