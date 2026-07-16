import { TLEmbedShape, createShapeId } from '@tldraw/editor'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { EmbedShapeUtil } from '../lib/shapes/embed/EmbedShapeUtil'
import { TestEditor } from './TestEditor'

let editor: TestEditor

beforeEach(() => {
	editor = new TestEditor()
	editor.selectAll().deleteShapes(editor.getSelectedShapeIds())
})

afterEach(() => {
	vi.restoreAllMocks()
	editor?.dispose()
})

// Mirrors the real Vimeo definition: aspect-ratio-locked (which the editor treats specially when
// resizing) and opted in to content-aspect-ratio sizing. Dimensions are resolved from url metadata
// (the unfurl path), so we also stub `getAssetForExternalContent` to return a bookmark asset whose
// `meta` carries the image dimensions for the given ratio.
function stubVimeoDefinition(url: string, aspectRatio: number | undefined) {
	return stubVimeoDefinitionByUrl(aspectRatio === undefined ? {} : { [url]: aspectRatio })
}

function stubVimeoDefinitionByUrl(ratios: Record<string, number>) {
	const util = editor.getShapeUtil('embed') as EmbedShapeUtil
	vi.spyOn(util, 'getEmbedDefinition').mockImplementation((url) => ({
		definition: {
			type: 'vimeo',
			width: 640,
			height: 360,
			isAspectRatioLocked: true,
			sizeToContentAspectRatio: true,
		} as any,
		url,
		embedUrl: url,
	}))
	vi.spyOn(editor, 'getAssetForExternalContent').mockImplementation(async (info: any) => {
		const ratio = ratios[info.url]
		const meta =
			typeof ratio === 'number' ? { imageWidth: Math.round(ratio * 1000), imageHeight: 1000 } : {}
		return { type: 'bookmark', meta } as any
	})
	return util
}

describe('embed aspect ratio correction', () => {
	it('corrects an embed to its resolved aspect ratio after creation', async () => {
		const url = 'https://vimeo.com/817841251'
		const util = stubVimeoDefinition(url, 1.5)

		const id = createShapeId()
		editor.createShape<TLEmbedShape>({
			id,
			type: 'embed',
			x: 100,
			y: 200,
			props: { w: 640, h: 360, url },
		})

		await util.resolveAspectRatio(editor.getShape<TLEmbedShape>(id)!)

		const shape = editor.getShape<TLEmbedShape>(id)!
		const correctedH = 640 / 1.5
		// the whole point: width is preserved and only the height changes, so the box actually takes
		// on the resolved 3:2 ratio (not merged into a uniform scale by the aspect-ratio lock)
		expect(shape.props.w).toBe(640)
		expect(shape.props.h).toBeCloseTo(correctedH)
		expect(shape.props.w / shape.props.h).toBeCloseTo(1.5)
		// width is unchanged so x stays put; the shape grows around its center vertically
		expect(shape.x).toBe(100)
		expect(shape.y).toBeCloseTo(200 - (correctedH - 360) / 2)

		// the correction must not be its own undo step: a single undo removes the whole creation,
		// rather than first reverting the resize
		editor.undo()
		expect(editor.getShape(id)).toBeUndefined()
	})

	it('keeps the page center fixed when the embed is rotated', async () => {
		const url = 'https://vimeo.com/333'
		const util = stubVimeoDefinition(url, 1.5)

		const id = createShapeId()
		editor.createShape<TLEmbedShape>({
			id,
			type: 'embed',
			x: 100,
			y: 200,
			rotation: Math.PI / 4,
			props: { w: 640, h: 360, url },
		})

		const centerBefore = editor.getShapePageBounds(id)!.center.clone()
		await util.resolveAspectRatio(editor.getShape<TLEmbedShape>(id)!)

		const shape = editor.getShape<TLEmbedShape>(id)!
		expect(shape.props.h).toBeCloseTo(640 / 1.5)
		const centerAfter = editor.getShapePageBounds(id)!.center
		expect(centerAfter.x).toBeCloseTo(centerBefore.x)
		expect(centerAfter.y).toBeCloseTo(centerBefore.y)
	})

	it('applies the new ratio when the url changes to a different video', async () => {
		const urlA = 'https://vimeo.com/111'
		const urlB = 'https://vimeo.com/222'
		const util = stubVimeoDefinitionByUrl({ [urlA]: 1.5, [urlB]: 1 })

		const id = createShapeId()
		editor.createShape<TLEmbedShape>({ id, type: 'embed', props: { w: 640, h: 360, url: urlA } })

		await util.resolveAspectRatio(editor.getShape<TLEmbedShape>(id)!)
		expect(editor.getShape<TLEmbedShape>(id)!.props.h).toBeCloseTo(640 / 1.5)

		// change the url to a 1:1 video — the new ratio should be applied even though the shape is no
		// longer at the definition's default 16:9 ratio
		editor.updateShape<TLEmbedShape>({ id, type: 'embed', props: { url: urlB } })
		await util.resolveAspectRatio(editor.getShape<TLEmbedShape>(id)!)

		const shape = editor.getShape<TLEmbedShape>(id)!
		expect(shape.props.w).toBe(640)
		expect(shape.props.h).toBeCloseTo(640)
	})

	it('ignores a stale resolution whose url no longer matches the shape', async () => {
		const urlA = 'https://vimeo.com/aaa'
		const urlB = 'https://vimeo.com/bbb'
		const util = stubVimeoDefinitionByUrl({ [urlA]: 1.5, [urlB]: 1 })

		const id = createShapeId()
		editor.createShape<TLEmbedShape>({ id, type: 'embed', props: { w: 640, h: 360, url: urlA } })
		// snapshot representing an in-flight run started while the shape still had urlA
		const staleShapeA = editor.getShape<TLEmbedShape>(id)!

		// the url changes to B and B's resolution lands first
		editor.updateShape<TLEmbedShape>({ id, type: 'embed', props: { url: urlB } })
		await util.resolveAspectRatio(editor.getShape<TLEmbedShape>(id)!)
		expect(editor.getShape<TLEmbedShape>(id)!.props.h).toBeCloseTo(640) // B's 1:1 ratio applied

		// now the stale run for urlA completes — it must not clobber the shape with A's 3:2 ratio
		await util.resolveAspectRatio(staleShapeA)
		expect(editor.getShape<TLEmbedShape>(id)!.props.h).toBeCloseTo(640)
	})

	it('resolves via a side effect when a user creates or re-points an embed', () => {
		const url = 'https://vimeo.com/create'
		const util = stubVimeoDefinition(url, 1.5)
		const spy = vi.spyOn(util, 'resolveAspectRatio').mockResolvedValue(undefined)

		const id = createShapeId()
		editor.createShape<TLEmbedShape>({ id, type: 'embed', props: { w: 640, h: 360, url } })
		expect(spy).toHaveBeenCalledTimes(1)

		// re-pointing the embed at a new url re-resolves
		editor.updateShape<TLEmbedShape>({
			id,
			type: 'embed',
			props: { url: 'https://vimeo.com/create2' },
		})
		expect(spy).toHaveBeenCalledTimes(2)

		// a non-url change (e.g. a resize) does not
		editor.updateShape<TLEmbedShape>({ id, type: 'embed', props: { w: 700 } })
		expect(spy).toHaveBeenCalledTimes(2)
	})

	it('does not resolve during rendering / svg export', async () => {
		// getSvgString relies on real async; TestEditor installs fake timers by default
		vi.useRealTimers()
		try {
			const url = 'https://vimeo.com/export'
			const util = stubVimeoDefinition(url, 1.5)

			const id = createShapeId()
			editor.createShape<TLEmbedShape>({ id, type: 'embed', props: { w: 640, h: 360, url } })

			// spy only on the export phase: resolution happens on create (via side effect), never as
			// part of rendering, so exporting must not call it
			const spy = vi.spyOn(util, 'resolveAspectRatio').mockResolvedValue(undefined)
			await editor.getSvgString([id])
			await new Promise((r) => setTimeout(r, 0))

			expect(spy).not.toHaveBeenCalled()
		} finally {
			vi.useFakeTimers()
		}
	}, 20000)

	it('does not resize when the editor is disposed while resolving', async () => {
		const url = 'https://vimeo.com/disposed'
		const util = stubVimeoDefinitionByUrl({ [url]: 1.5 })

		const id = createShapeId()
		editor.createShape<TLEmbedShape>({ id, type: 'embed', props: { w: 640, h: 360, url } })
		const shape = editor.getShape<TLEmbedShape>(id)!

		// tear the editor down mid-flight
		const resizeSpy = vi.spyOn(editor, 'resizeShape')
		vi.spyOn(editor, 'getAssetForExternalContent').mockImplementation(async () => {
			editor.dispose()
			return { type: 'bookmark', meta: { imageWidth: 1500, imageHeight: 1000 } } as any
		})

		await expect(util.resolveAspectRatio(shape)).resolves.toBeUndefined()
		expect(resizeSpy).not.toHaveBeenCalled()
	})

	it('does nothing when the resolved ratio matches the assumed ratio', async () => {
		const url = 'https://vimeo.com/59749737'
		const util = stubVimeoDefinition(url, 640 / 360)

		const id = createShapeId()
		editor.createShape<TLEmbedShape>({
			id,
			type: 'embed',
			props: { w: 640, h: 360, url },
		})

		await util.resolveAspectRatio(editor.getShape<TLEmbedShape>(id)!)

		const shape = editor.getShape<TLEmbedShape>(id)!
		expect(shape.props.w).toBe(640)
		expect(shape.props.h).toBe(360)
	})
})
