import { act } from '@testing-library/react'
import {
	Editor,
	FLAGS,
	LicenseContext,
	LicenseManager,
	StateNode,
	promiseWithResolve,
} from '@tldraw/editor'
import { vi } from 'vitest'
import { Tldraw } from '../lib/Tldraw'
import { TldrawPlugin } from '../lib/TldrawPlugin'
import { renderTldrawComponent } from './testutils/renderTldrawComponent'

class GatedTool extends StateNode {
	static override id = 'gated-tool'
}

function makeGatedPlugin({
	onMount,
}: {
	onMount?(editor: Editor): void
} = {}): TldrawPlugin {
	return {
		id: 'test.gated',
		requiredLicenseFlags: FLAGS.COMMENTS_PLUGIN,
		components: {
			InFrontOfTheCanvas: function GatedOverlay() {
				return <div data-testid="gated-overlay" />
			},
		},
		tools: [GatedTool],
		onMount,
	}
}

function makeStubManager(features: number) {
	const manager = new LicenseManager(undefined)
	manager.features.set(features)
	return manager
}

async function renderWithManager(manager: LicenseManager, plugin: TldrawPlugin) {
	const editorPromise = promiseWithResolve<Editor>()
	const rendered = await renderTldrawComponent(
		<LicenseContext.Provider value={manager}>
			<Tldraw plugins={[plugin]} onMount={(editor) => editorPromise.resolve(editor)} />
		</LicenseContext.Provider>,
		{ waitForPatterns: false }
	)
	const editor = await editorPromise
	return { rendered, editor }
}

describe('plugin licensing', () => {
	it('renders a gated plugin when the license includes its flag', async () => {
		const onMount = vi.fn()
		const manager = makeStubManager(FLAGS.COMMENTS_PLUGIN)
		const { rendered } = await renderWithManager(manager, makeGatedPlugin({ onMount }))

		expect(await rendered.findByTestId('gated-overlay')).toBeTruthy()
		expect(onMount).toHaveBeenCalledTimes(1)
	})

	it('suppresses a gated plugin without the flag, but still registers its tools', async () => {
		const onMount = vi.fn()
		const manager = makeStubManager(0)
		const { rendered, editor } = await renderWithManager(manager, makeGatedPlugin({ onMount }))

		expect(rendered.queryByTestId('gated-overlay')).toBeNull()
		expect(onMount).not.toHaveBeenCalled()
		// registration is never gated: the tool is in the state chart even when unentitled
		expect(editor.getStateDescendant('gated-tool')).toBeTruthy()
	})

	it('activates a gated plugin when entitlement resolves after mount', async () => {
		const onMount = vi.fn()
		const manager = makeStubManager(0)
		const { rendered } = await renderWithManager(manager, makeGatedPlugin({ onMount }))

		expect(rendered.queryByTestId('gated-overlay')).toBeNull()
		expect(onMount).not.toHaveBeenCalled()

		await act(async () => {
			manager.features.set(FLAGS.COMMENTS_PLUGIN)
		})

		expect(await rendered.findByTestId('gated-overlay')).toBeTruthy()
		expect(onMount).toHaveBeenCalledTimes(1)
	})

	it('does not gate plugins without requiredLicenseFlags', async () => {
		const manager = makeStubManager(0)
		const plugin: TldrawPlugin = {
			id: 'test.ungated',
			components: {
				InFrontOfTheCanvas: function UngatedOverlay() {
					return <div data-testid="ungated-overlay" />
				},
			},
		}
		const { rendered } = await renderWithManager(manager, plugin)
		expect(await rendered.findByTestId('ungated-overlay')).toBeTruthy()
	})

	it('warns once when the license resolves without a required flag', async () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => void 0)
		try {
			const manager = makeStubManager(0)
			await act(async () => {
				manager.state.set('unlicensed')
			})
			await renderWithManager(manager, makeGatedPlugin())

			const pluginWarnings = warn.mock.calls.filter((args) =>
				String(args[0]).includes('test.gated')
			)
			expect(pluginWarnings).toHaveLength(1)
		} finally {
			warn.mockRestore()
		}
	})
})
