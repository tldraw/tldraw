// `new Editor()` is the legacy entry. It installs `legacyEditorPlugins`, so its behavior is the
// behavior that the editor had before plugins. These tests pin that compatibility layer.
import { vi } from 'vitest'
import { Editor, TextManager, createShapeId, createTLStore, legacyEditorPlugins } from '../..'
import { GroupShapeUtil } from '../editor/shapes/group/GroupShapeUtil'
import { renderShapeComponent, shapeComponentSlot } from '../react/shapeComponents'
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
	it('installs the legacy plugins', () => {
		const editor = legacyEditor()
		expect(editor.plugins.getPlugins().map((p) => p.id)).toEqual(
			expect.arrayContaining(legacyEditorPlugins.map((p) => p.id))
		)
		expect(editor.textMeasure).toBeInstanceOf(TextManager)
	})

	it('replaces a legacy plugin with a plugin that provides the same capability', () => {
		const editor = legacyEditor({ plugins: [approximateTextMeasurementPlugin()] })
		expect(editor.textMeasure).not.toBeInstanceOf(TextManager)
		expect(editor.plugins.has('domTextMeasurement')).toBe(false)
		expect(editor.plugins.has('snapping')).toBe(true)
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

describe('the React shape component slot', () => {
	it('renders a shape with a plugin contribution, and with ShapeUtil.component without one', () => {
		const editor = legacyEditor()
		const group = editor.getShapeUtil<GroupShapeUtil>('group')
		const shape = { id: 'shape:g', type: 'group' } as any
		// The group util has no React. The React layer's group plugin renders it.
		expect(group.component()).toBeNull()
		expect(editor.plugins.list(shapeComponentSlot).map((c) => c.type)).toContain('group')
		// An erasing group shows its outline, so the default contribution renders an element.
		const id = createShapeId('g')
		editor.createShape({ id, type: 'group' })
		editor.setErasingShapes([id])
		expect(renderShapeComponent(group, editor.getShape(id)!)).not.toBeNull()

		const custom = legacyEditor({
			plugins: [
				definePlugin({
					id: 'react.groupShapeComponent',
					setup(ctx) {
						ctx.contribute(shapeComponentSlot, { type: 'group', component: () => 'custom group' })
					},
				}),
			],
		})
		expect(renderShapeComponent(custom.getShapeUtil('group'), shape)).toBe('custom group')
	})
})
