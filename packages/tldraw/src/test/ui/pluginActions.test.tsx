import { act, render } from '@testing-library/react'
import { Editor, TldrawEditor, definePlugin } from '@tldraw/editor'
import { createTldrawPlugins } from '../../lib/defaultPlugins'
import { defaultShapeTools } from '../../lib/defaultShapeTools'
import { defaultShapeUtils } from '../../lib/defaultShapeUtils'
import { defaultTools } from '../../lib/defaultTools'
import { Tldraw } from '../../lib/Tldraw'
import { TLUiActionsContextType, useActions } from '../../lib/ui/context/actions'
import { TldrawUi } from '../../lib/ui/TldrawUi'
import { uiActionItemsSlot } from '../../lib/ui/uiSlots'
import {
	renderTldrawComponent,
	renderTldrawComponentWithEditor,
} from '../testutils/renderTldrawComponent'

let actions: TLUiActionsContextType
function ReadActions() {
	actions = useActions()
	return null
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

// The plugins whose actions move with them, and the ids of those actions.
const pluginActionIds = {
	embedShape: ['insert-embed', 'open-embed-link', 'convert-to-embed'],
	bookmarkShape: ['convert-to-bookmark'],
	textShape: ['toggle-auto-size'],
	frameShape: ['frame-selection'],
	geoShape: ['select-geo-tool'],
	zoomTool: ['select-zoom-tool'],
	imageShape: ['insert-media', 'crop-image', 'image-replace', 'flatten-to-image'],
	videoShape: ['video-replace'],
}

let jumps = 0
const jumpPlugin = definePlugin({
	id: 'jump',
	setup(ctx) {
		ctx.contribute(uiActionItemsSlot, () => [
			{ id: 'jump', label: 'action.jump', kbd: 'j', onSelect: () => void jumps++ },
		])
	},
})

describe('actions from plugins', () => {
	it('gives <Tldraw> the default actions in their usual order', async () => {
		await renderTldrawComponent(
			<Tldraw>
				<ReadActions />
			</Tldraw>,
			{ waitForPatterns: false }
		)
		expect(Object.keys(actions)).toMatchSnapshot()
	})

	it('gives an editor without the tldraw plugins the same actions', async () => {
		await renderTldrawComponent(
			<Tldraw>
				<ReadActions />
			</Tldraw>,
			{ waitForPatterns: false }
		)
		const expected = Object.keys(actions)

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
					<ReadActions />
				</TldrawUi>
			</TldrawEditor>
		)
		await mounted
		await act(async () => {})
		expect(Object.keys(actions)).toEqual(expected)
	})

	it('keeps the same actions across renders of the UI', async () => {
		const seen = new Set<TLUiActionsContextType>()
		function CollectActions() {
			seen.add(useActions())
			return null
		}
		await renderTldrawComponent(
			<Tldraw>
				<CollectActions />
			</Tldraw>,
			{ waitForPatterns: false }
		)
		expect(seen.size).toBe(1)
	})

	it('has no action or shortcut for a plugin that is left out', async () => {
		const leftOut = Object.keys(pluginActionIds)
		const plugins = createTldrawPlugins().filter((p) => !leftOut.includes(p.id))
		const errorSpy = vi.spyOn(console, 'error')
		const { editor } = await renderTldrawComponentWithEditor(
			(onMount) => (
				<Tldraw onMount={onMount} plugins={plugins}>
					<ReadActions />
				</Tldraw>
			),
			{ waitForPatterns: false }
		)
		for (const id of Object.values(pluginActionIds).flat()) {
			expect(actions[id]).toBeUndefined()
		}
		await act(async () => editor.focus())
		await pressKey('g')
		await pressKey('z')
		expect(editor.getCurrentToolId()).toBe('select')
		expect(errorSpy).not.toHaveBeenCalled()
		errorSpy.mockRestore()
	})

	it('runs a third-party action from its shortcut', async () => {
		jumps = 0
		const { editor } = await renderTldrawComponentWithEditor(
			(onMount) => (
				<Tldraw onMount={onMount} plugins={[...createTldrawPlugins(), jumpPlugin]}>
					<ReadActions />
				</Tldraw>
			),
			{ waitForPatterns: false }
		)
		expect(Object.keys(actions)).toContain('jump')
		await act(async () => editor.focus())
		await pressKey('j')
		expect(jumps).toBe(1)
	})

	it('puts an action with a built-in id in the place of the built-in action', async () => {
		await renderTldrawComponent(
			<Tldraw>
				<ReadActions />
			</Tldraw>,
			{ waitForPatterns: false }
		)
		const expected = Object.keys(actions)

		const myEmbed = definePlugin({
			id: 'myEmbed',
			setup(ctx) {
				ctx.contribute(uiActionItemsSlot, () => [
					{ id: 'insert-embed', label: 'action.my-embed', onSelect() {} },
				])
			},
		})
		const plugins = [...createTldrawPlugins().filter((p) => p.id !== 'embedShape'), myEmbed]
		await renderTldrawComponent(
			<Tldraw plugins={plugins}>
				<ReadActions />
			</Tldraw>,
			{ waitForPatterns: false }
		)
		expect(actions['insert-embed'].label).toBe('action.my-embed')
		const withoutEmbed = expected.filter(
			(id) => id === 'insert-embed' || !pluginActionIds.embedShape.includes(id)
		)
		expect(Object.keys(actions)).toEqual(withoutEmbed)
	})

	it('throws when two plugins contribute an action with the same id', async () => {
		const jumpAgain = definePlugin({
			id: 'jumpAgain',
			setup(ctx) {
				ctx.contribute(uiActionItemsSlot, () => [{ id: 'jump', onSelect() {} }])
			},
		})
		const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
		const plugins = [...createTldrawPlugins(), jumpPlugin, jumpAgain]
		// The error boundary catches the error and logs it, so the editor never shows its canvas.
		await renderTldrawComponent(<Tldraw plugins={plugins} />, { waitForPatterns: false }).catch(
			() => {}
		)
		expect(errorSpy.mock.calls.flat().map(String).join('\n')).toContain(
			'Two plugins contribute an action with id "jump"'
		)
		errorSpy.mockRestore()
	})

	it('applies action overrides to plugin actions', async () => {
		const overrides = {
			actions(_editor: Editor, actions: TLUiActionsContextType) {
				return { ...actions, 'select-geo-tool': { ...actions['select-geo-tool'], kbd: 'q' } }
			},
		}
		await renderTldrawComponent(
			<Tldraw overrides={overrides}>
				<ReadActions />
			</Tldraw>,
			{ waitForPatterns: false }
		)
		expect(actions['select-geo-tool'].kbd).toBe('q')
	})
})
