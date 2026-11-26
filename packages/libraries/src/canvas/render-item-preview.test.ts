import {
	DEFAULT_THEME,
	Editor,
	createShapeId,
	createTLStore,
	defaultBindingUtils,
	defaultShapeUtils,
	type TLImageExportOptions,
	type TLShapeId,
} from 'tldraw'
import { vi } from 'vitest'
import { renderItemPreview } from './render-item-preview'

let host: Editor
let exported: { svg: string; darkMode?: boolean; themeId: string }[]

beforeEach(() => {
	host = new Editor({
		shapeUtils: defaultShapeUtils,
		bindingUtils: defaultBindingUtils,
		tools: [],
		store: createTLStore({ shapeUtils: defaultShapeUtils, bindingUtils: defaultBindingUtils }),
		getContainer: () => document.body,
		themes: { ocean: { ...DEFAULT_THEME, id: 'ocean' } } as any,
	})
	exported = []
	// jsdom can't rasterise, so the preview is checked as the SVG the PNG would be made from.
	vi.spyOn(Editor.prototype, 'toImage').mockImplementation(async function (
		this: Editor,
		ids,
		opts: TLImageExportOptions = {}
	) {
		const result = await this.getSvgString(ids as TLShapeId[], opts)
		exported.push({ svg: result!.svg, darkMode: opts.darkMode, themeId: this.getCurrentThemeId() })
		return { blob: new Blob([result!.svg]), width: result!.width, height: result!.height }
	})
})

afterEach(() => {
	vi.restoreAllMocks()
	host.dispose()
})

function contentOf(shapeIds: TLShapeId[]) {
	return host.getContentFromCurrentPage(shapeIds)!
}

it('draws the item’s shapes without adding them to the document', async () => {
	const id = createShapeId('box')
	host.createShapes([{ id, type: 'geo', x: 0, y: 0, props: { w: 100, h: 100 } }])
	const content = contentOf([id])
	host.deleteShapes([id])

	const blob = await renderItemPreview(host, content, { darkMode: true, themeId: 'default' })

	expect(blob).not.toBeNull()
	expect(exported).toHaveLength(1)
	expect(exported[0].darkMode).toBe(true)
	expect(exported[0].svg).toContain('<path')
	expect(host.getCurrentPageShapeIds().size).toBe(0)
	expect(document.querySelectorAll('[aria-hidden="true"].tl-container')).toHaveLength(0)
})

it('draws nothing for content without shapes', async () => {
	const content = {
		shapes: [],
		bindings: [],
		rootShapeIds: [],
		assets: [],
		schema: host.store.schema.serialize(),
	}
	expect(await renderItemPreview(host, content, { darkMode: false, themeId: 'default' })).toBeNull()
})

it('draws in the theme it is given', async () => {
	const id = createShapeId('box')
	host.createShapes([{ id, type: 'geo', x: 0, y: 0, props: { w: 100, h: 100 } }])
	await renderItemPreview(host, host.getContentFromCurrentPage([id])!, {
		darkMode: false,
		themeId: 'ocean' as any,
	})
	expect(exported[0].themeId).toBe('ocean')
})
