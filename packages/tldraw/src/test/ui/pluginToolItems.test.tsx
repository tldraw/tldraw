import { act, render } from '@testing-library/react'
import { Editor, GeoShapeGeoStyle, StateNode, TldrawEditor, definePlugin } from '@tldraw/editor'
import { createTldrawPlugins } from '../../lib/defaultPlugins'
import { defaultShapeTools } from '../../lib/defaultShapeTools'
import { defaultShapeUtils } from '../../lib/defaultShapeUtils'
import { defaultTools } from '../../lib/defaultTools'
import { Tldraw } from '../../lib/Tldraw'
import { TLUiToolsContextType, useTools } from '../../lib/ui/hooks/useTools'
import { TldrawUi } from '../../lib/ui/TldrawUi'
import { uiToolItemsSlot, uiToolbarSlot } from '../../lib/ui/uiSlots'
import {
	renderTldrawComponent,
	renderTldrawComponentWithEditor,
} from '../testutils/renderTldrawComponent'

// The tool item ids in the order that the command palette and keyboard shortcuts walk them.
const defaultToolItemIds = [
	'select',
	'hand',
	'eraser',
	'draw',
	...GeoShapeGeoStyle.values,
	'arrow',
	'line',
	'frame',
	'text',
	'asset',
	'note',
	'laser',
	'embed',
	'highlight',
]

let tools: TLUiToolsContextType
function ReadTools() {
	tools = useTools()
	return null
}

function toolbarIds() {
	return [...document.querySelectorAll('[data-testid^="tools."]')].map((el) =>
		el.getAttribute('data-testid')!.slice('tools.'.length)
	)
}

async function pressKey(key: string) {
	await act(async () => {
		document.body.dispatchEvent(
			new KeyboardEvent('keydown', { key, code: `Key${key.toUpperCase()}`, bubbles: true })
		)
		document.body.dispatchEvent(
			new KeyboardEvent('keyup', { key, code: `Key${key.toUpperCase()}`, bubbles: true })
		)
	})
}

class CardTool extends StateNode {
	static override id = 'card'
}

const cardPlugin = definePlugin({
	id: 'cardTool',
	tools: [CardTool],
	setup(ctx) {
		ctx.contribute(uiToolItemsSlot, ({ editor, onToolSelect }) => [
			{
				id: 'card',
				label: 'tool.card',
				icon: 'tool-note',
				kbd: 'c',
				onSelect(source) {
					editor.setCurrentTool('card')
					onToolSelect(source, this)
				},
			},
		])
		ctx.contribute(uiToolbarSlot, { tool: 'card' })
	},
})

describe('tool items from plugins', () => {
	it('gives <Tldraw> the default tool items in their usual order', async () => {
		await renderTldrawComponent(
			<Tldraw>
				<ReadTools />
			</Tldraw>,
			{ waitForPatterns: false }
		)
		expect(Object.keys(tools)).toEqual(defaultToolItemIds)
		expect(toolbarIds()).toContain('arrow')
	})

	it('gives an editor without the tldraw plugins the default tool items', async () => {
		let resolve!: (editor: Editor) => void
		const mounted = new Promise<Editor>((r) => (resolve = r))
		render(
			<TldrawEditor
				initialState="select"
				shapeUtils={defaultShapeUtils}
				tools={[...defaultTools, ...defaultShapeTools]}
				onMount={resolve}
			>
				<TldrawUi>
					<ReadTools />
				</TldrawUi>
			</TldrawEditor>
		)
		await mounted
		await act(async () => {})
		expect(Object.keys(tools)).toEqual(defaultToolItemIds)
	})

	it('has no tool item, toolbar button or shortcut for a plugin that is left out', async () => {
		const plugins = createTldrawPlugins().filter((p) => p.id !== 'arrowShape')
		const { editor } = await renderTldrawComponentWithEditor(
			(onMount) => (
				<Tldraw onMount={onMount} plugins={plugins}>
					<ReadTools />
				</Tldraw>
			),
			{ waitForPatterns: false }
		)
		expect(tools.arrow).toBeUndefined()
		expect(toolbarIds()).not.toContain('arrow')
		await act(async () => editor.focus())
		await pressKey('a')
		expect(editor.getCurrentToolId()).toBe('select')
	})

	it('shows a tool item and toolbar placement from a third-party plugin', async () => {
		const plugins = [...createTldrawPlugins(), cardPlugin]
		const { editor } = await renderTldrawComponentWithEditor(
			(onMount) => (
				<Tldraw onMount={onMount} plugins={plugins}>
					<ReadTools />
				</Tldraw>
			),
			{ waitForPatterns: false }
		)
		expect(Object.keys(tools).at(-1)).toBe('card')
		expect(toolbarIds()).toContain('card')
		await act(async () => editor.focus())
		await pressKey('c')
		expect(editor.getCurrentToolId()).toBe('card')
	})

	it('applies tool overrides to plugin tool items', async () => {
		const overrides = {
			tools(_editor: Editor, tools: TLUiToolsContextType) {
				return { ...tools, arrow: { ...tools.arrow, kbd: 'q' } }
			},
		}
		await renderTldrawComponent(
			<Tldraw overrides={overrides}>
				<ReadTools />
			</Tldraw>,
			{ waitForPatterns: false }
		)
		expect(tools.arrow.kbd).toBe('q')
	})
})
