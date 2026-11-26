import { StateNode, createDefaultPlugins, definePlugin } from '@tldraw/editor'
import { TestEditor } from '../test/TestEditor'
import { defaultBindingUtils } from './defaultBindingUtils'
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
			'Shape type "geo" is defined more than once'
		)
	})

	it('are not installed by the editor defaults', () => {
		expect(createDefaultPlugins().some((p) => p.shapeUtils?.length || p.tools?.length)).toBe(false)
	})
})
