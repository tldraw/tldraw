// `new Editor()` without `plugins` installs `createDefaultPlugins()`, so its behavior is the
// behavior that the editor had before plugins. These tests pin that compatibility layer.
import { vi } from 'vitest'
import { Editor, createDefaultPlugins, createShapeId, createTLStore } from '../..'
import { GroupShapeUtil } from '../editor/shapes/group/GroupShapeUtil'
import { shapeViewSlot } from '../editor/shapes/shapeViews'
import { approximateTextMeasurementPlugin } from './builtin/textMeasurement'
import { TLPlugin, definePlugin } from './plugin'

function legacyEditor(opts: { plugins?: TLPlugin[]; autoFocus?: boolean } = {}) {
	return new Editor({
		shapeUtils: [],
		bindingUtils: [],
		tools: [],
		store: createTLStore({ shapeUtils: [], bindingUtils: [] }),
		getContainer: () => document.body,
		...opts,
	})
}

describe('new Editor()', () => {
	it('installs the default plugins when no plugins are given', () => {
		const editor = legacyEditor()
		expect(
			editor.plugins
				.getPlugins()
				.map((p) => p.id)
				.sort()
		).toEqual(
			createDefaultPlugins()
				.map((p) => p.id)
				.sort()
		)
		expect(editor.plugins.has('domTextMeasurement')).toBe(true)
	})

	it('installs exactly the given plugins', () => {
		const editor = legacyEditor({ plugins: [approximateTextMeasurementPlugin()] })
		expect(editor.plugins.getPlugins().map((p) => p.id)).toEqual(['approximateTextMeasurement'])
	})

	it('replaces a default plugin when the caller filters it out', () => {
		const editor = legacyEditor({
			plugins: [
				...createDefaultPlugins().filter((p) => p.id !== 'domTextMeasurement'),
				approximateTextMeasurementPlugin(),
			],
		})
		expect(editor.plugins.has('domTextMeasurement')).toBe(false)
		expect(editor.plugins.has('approximateTextMeasurement')).toBe(true)
		expect(editor.plugins.has('snapping')).toBe(true)
	})

	it('throws when a plugin duplicates a default capability', () => {
		expect(() =>
			legacyEditor({ plugins: [...createDefaultPlugins(), approximateTextMeasurementPlugin()] })
		).toThrow('both provide')
	})

	it('applies autoFocus to the instance state', () => {
		expect(legacyEditor({ autoFocus: true }).getIsFocused()).toBe(true)
		expect(legacyEditor({ autoFocus: false }).getIsFocused()).toBe(false)
	})

	it('completes the current interaction before it blurs the container', () => {
		const editor = legacyEditor({ autoFocus: true })
		const order: string[] = []
		vi.spyOn(editor, 'complete').mockImplementation(() => {
			order.push('complete')
			return editor
		})
		vi.spyOn(document.body, 'blur').mockImplementation(() => order.push('blur'))
		editor.blur()
		expect(order).toEqual(['complete', 'blur'])
	})

	it('does not blur the container when blurContainer is false', () => {
		const editor = legacyEditor({ autoFocus: true })
		const blur = vi.spyOn(document.body, 'blur')
		editor.blur({ blurContainer: false })
		expect(blur).not.toHaveBeenCalled()
		expect(editor.getIsFocused()).toBe(false)
	})
})

describe('shape views', () => {
	it('renders a shape with its view through ShapeUtil.component', () => {
		const editor = legacyEditor()
		const group = editor.getShapeUtil<GroupShapeUtil>('group')
		// The group util has no React. The React layer's group view renders it.
		expect(editor.plugins.list(shapeViewSlot).map((v) => v.type)).toContain('group')
		// An erasing group shows its outline, so the view renders an element.
		const id = createShapeId('g')
		editor.createShape({ id, type: 'group' })
		editor.setErasingShapes([id])
		expect(group.component(editor.getShape(id)!)).not.toBeNull()

		const custom = legacyEditor({
			plugins: [
				definePlugin({
					id: 'react.groupShapeView',
					setup(ctx) {
						ctx.contribute(shapeViewSlot, { type: 'group', component: () => 'custom group' })
					},
				}),
			],
		})
		const shape = { id: 'shape:g', type: 'group' } as any
		expect(custom.getShapeUtil('group').component(shape)).toBe('custom group')
	})

	it('throws when two plugins contribute a view for the same shape type', () => {
		const editor = legacyEditor({
			plugins: [
				...createDefaultPlugins(),
				definePlugin({
					id: 'secondGroupView',
					setup(ctx) {
						ctx.contribute(shapeViewSlot, { type: 'group', component: () => null })
					},
				}),
			],
		})
		expect(() => editor.getShapeUtil('group').getView()).toThrow(
			'Two plugins contribute a view for the "group" shape'
		)
	})
})
