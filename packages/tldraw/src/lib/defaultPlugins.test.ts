import { readFileSync } from 'fs'
import { join } from 'path'
import {
	AssetRecordType,
	StateNode,
	TLAssetId,
	createDefaultPlugins,
	definePlugin,
} from '@tldraw/editor'
import { TestEditor } from '../test/TestEditor'
import { defaultBindingUtils } from './defaultBindingUtils'
import {
	createShapesForAssets,
	registerDefaultExternalContentHandlers,
} from './defaultExternalContentHandlers'
import { createTldrawPlugins, defaultShapePlugins, defaultToolPlugins } from './defaultPlugins'
import { defaultShapeTools } from './defaultShapeTools'
import { defaultShapeUtils } from './defaultShapeUtils'
import { defaultTools } from './defaultTools'
import { GeoShapeTool } from './shapes/geo/GeoShapeTool'
import { GeoShapeUtil } from './shapes/geo/GeoShapeUtil'
import { SelectTool } from './tools/SelectTool/SelectTool'

class MyGeoShapeUtil extends GeoShapeUtil {}

class MySelectTool extends StateNode {
	static override id = 'select'
}

describe('default shape and tool plugins', () => {
	it('declare the same records, in the same order, as the default lists', () => {
		expect(defaultShapePlugins.flatMap((p) => p.shapeUtils ?? [])).toEqual([...defaultShapeUtils])
		expect(defaultShapePlugins.flatMap((p) => p.bindingUtils ?? [])).toEqual([
			...defaultBindingUtils,
		])
		expect(defaultShapePlugins.flatMap((p) => p.tools ?? [])).toEqual([...defaultShapeTools])
		expect(defaultToolPlugins.flatMap((p) => p.tools ?? [])).toEqual([...defaultTools])
		expect(
			defaultToolPlugins.flatMap((p) => [...(p.shapeUtils ?? []), ...(p.bindingUtils ?? [])])
		).toEqual([])
	})

	it('give the editor every default shape, binding and tool', () => {
		const editor = new TestEditor()
		for (const Util of defaultShapeUtils) expect(editor.hasShapeUtil(Util.type)).toBe(true)
		for (const Util of defaultBindingUtils)
			expect(editor.bindingUtils[Util.type]).toBeInstanceOf(Util)
		for (const Tool of [...defaultTools, ...defaultShapeTools]) {
			expect(editor.root.children![Tool.id]).toBeInstanceOf(Tool)
		}
	})

	it('let a shape util option replace the plugin util of the same type and keep its tool', () => {
		const editor = new TestEditor({ shapeUtils: [MyGeoShapeUtil] })
		expect(editor.getShapeUtil('geo')).toBeInstanceOf(MyGeoShapeUtil)
		expect(editor.root.children!.geo).toBeInstanceOf(GeoShapeTool)
		editor.createShape({ type: 'geo' })
		expect(editor.getCurrentPageShapes()).toHaveLength(1)
	})

	it('let a tool option replace the plugin tool of the same id', () => {
		const editor = new TestEditor({ tools: [MySelectTool], initialState: 'select' })
		expect(editor.root.children!.select).toBeInstanceOf(MySelectTool)
		expect(editor.root.children!.select).not.toBeInstanceOf(SelectTool)
	})

	it('remove a shape and its tool when its plugin is left out', () => {
		const editor = new TestEditor({
			plugins: createTldrawPlugins().filter((p) => p.id !== 'geoShape'),
		})
		expect(editor.hasShapeUtil('geo')).toBe(false)
		expect(editor.root.children!.geo).toBeUndefined()
		expect(() => editor.createShape({ type: 'geo' })).toThrow()
		expect(editor.hasShapeUtil('arrow')).toBe(true)
	})

	it('throw when two plugins declare the same shape type', () => {
		const geoAgain = definePlugin({ id: 'geoAgain', shapeUtils: [MyGeoShapeUtil] })
		expect(() => new TestEditor({ plugins: [...createTldrawPlugins(), geoAgain] })).toThrow(
			'Shape type "geo" is declared by both plugin "geoShape" and plugin "geoAgain"'
		)
	})

	it('throw for two plugins with the same shape type even when an option replaces it', () => {
		const geoAgain = definePlugin({ id: 'geoAgain', shapeUtils: [MyGeoShapeUtil] })
		expect(
			() =>
				new TestEditor({
					plugins: [...createTldrawPlugins(), geoAgain],
					shapeUtils: [MyGeoShapeUtil],
				})
		).toThrow('declared by both plugin "geoShape" and plugin "geoAgain"')
	})

	it('are not installed by the editor defaults', () => {
		expect(createDefaultPlugins().some((p) => p.shapeUtils?.length || p.tools?.length)).toBe(false)
	})
})

describe('createShapesForAssets', () => {
	it('skips assets that no shape util handles', async () => {
		const editor = new TestEditor({
			plugins: createTldrawPlugins().filter((p) => p.id !== 'videoShape'),
		})
		const asset = AssetRecordType.create({
			id: AssetRecordType.createId(),
			type: 'video',
			props: {
				name: 'a.mp4',
				src: 'a.mp4',
				w: 100,
				h: 100,
				mimeType: 'video/mp4',
				isAnimated: true,
			},
		})
		const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
		expect(await createShapesForAssets(editor, [asset], { x: 0, y: 0 })).toEqual([])
		expect(editor.getAsset(asset.id)).toBeUndefined()
		errorSpy.mockRestore()
	})
})

describe('default paste and drop handlers without a shape plugin', () => {
	function editorWithout(...ids: string[]) {
		const editor = new TestEditor({
			plugins: createTldrawPlugins().filter((p) => !ids.includes(p.id)),
		})
		registerDefaultExternalContentHandlers(editor, {
			toasts: {
				addToast: vi.fn(),
				removeToast: vi.fn(),
				clearToasts: vi.fn(),
				toasts: { get: () => [] } as any,
			},
			msg: ((key: string) => key) as any,
		})
		return editor
	}

	it('pastes no text shape without the text plugin', async () => {
		const editor = editorWithout('textShape')
		await editor.putExternalContent({ type: 'text', text: 'hello' })
		expect(editor.getCurrentPageShapes()).toEqual([])
	})

	it('pastes nothing for a url without the embed and bookmark plugins', async () => {
		const editor = editorWithout('embedShape', 'bookmarkShape')
		await editor.putExternalContent({
			type: 'url',
			url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
		})
		expect(editor.getCurrentPageShapes()).toEqual([])
	})

	it('puts no embed shape without the embed plugin', async () => {
		const editor = editorWithout('embedShape')
		const embed = {
			type: 'youtube',
			title: 'YouTube',
			hostnames: [],
			width: 800,
			height: 450,
			doesResize: true,
			toEmbedUrl: (u: string) => u,
			fromEmbedUrl: (u: string) => u,
		}
		await editor.putExternalContent({
			type: 'embed',
			url: 'https://www.youtube.com/embed/x',
			embed,
		} as any)
		expect(editor.getCurrentPageShapes()).toEqual([])
	})

	it('does not upload a dropped video without the video plugin', async () => {
		const editor = editorWithout('videoShape')
		const videoAssetUtil = {
			acceptsMimeType: (mimeType: string) => mimeType === 'video/mp4',
			getAssetFromFile: async (_file: File, id: TLAssetId) =>
				AssetRecordType.create({
					id,
					type: 'video',
					props: {
						w: 100,
						h: 100,
						name: 'v.mp4',
						isAnimated: true,
						mimeType: 'video/mp4',
						src: null,
					},
				}),
		}
		vi.spyOn(editor, 'getAssetUtilForMimeType').mockReturnValue(videoAssetUtil as any)
		const upload = vi.spyOn(editor, 'getAssetForExternalContent')
		const file = new File(['x'], 'v.mp4', { type: 'video/mp4' })
		await editor.putExternalContent({ type: 'files', files: [file] })
		expect(upload).not.toHaveBeenCalled()
		expect(editor.getCurrentPageShapes()).toEqual([])
	})

	it('pastes the shapes it can from excalidraw content', async () => {
		const editor = editorWithout('arrowShape')
		const content = JSON.parse(
			readFileSync(
				join(__dirname, 'utils/excalidraw/excalidraw-test-fixtures/bound-arrows.json'),
				'utf-8'
			)
		)
		await editor.putExternalContent({ type: 'excalidraw', content })
		const types = new Set(editor.getCurrentPageShapes().map((s) => s.type))
		expect(types.has('arrow')).toBe(false)
		expect(types.size).toBeGreaterThan(0)
	})

	it('pastes the shapes it can from tldraw content', async () => {
		const source = new TestEditor()
		source.createShapes([
			{ type: 'geo', x: 0, y: 0 },
			{ type: 'note', x: 200, y: 0 },
		])
		source.selectAll()
		const content = source.getContentFromCurrentPage(source.getSelectedShapeIds())!
		const editor = editorWithout('geoShape')
		await editor.putExternalContent({ type: 'tldraw', content })
		expect(editor.getCurrentPageShapes().map((s) => s.type)).toEqual(['note'])
	})
})
