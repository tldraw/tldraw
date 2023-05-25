import { render, screen } from '@testing-library/react'
import { InstanceRecordType, UserRecordType } from '@tldraw/tlschema'
import { TldrawEditor } from '../TldrawEditor'
import { createDefaultTldrawEditorStore } from '../config/createDefaultTldrawEditorStore'
import { DEFAULT_SHAPE_UTILS } from '../config/defaultShapeUtils'
import { DEFAULT_TOOLS } from '../config/defaultTools'

let originalFetch: typeof window.fetch
beforeEach(() => {
	window.fetch = jest.fn().mockImplementation((...args: Parameters<typeof fetch>) => {
		if (args[0] === '/icons/icon/icon-names.json') {
			return Promise.resolve({ json: () => Promise.resolve([]) } as Response)
		}

		return originalFetch(...args)
	})
})

afterEach(() => {
	jest.restoreAllMocks()
	window.fetch = originalFetch
})

describe('<TldrawEditor />', () => {
	it('Accepts fresh versions of store and calls `onMount` for each one', async () => {
		const store = createDefaultTldrawEditorStore({
			instanceId: InstanceRecordType.createCustomId('test'),
			userId: UserRecordType.createCustomId('test'),
		})

		const onMount = jest.fn()

		const rendered = render(
			<TldrawEditor store={store} shapes={DEFAULT_SHAPE_UTILS} tools={DEFAULT_TOOLS}>
				<div data-testid="canvas-1" />
			</TldrawEditor>
		)
		await screen.findByTestId('canvas-1')
		expect(onMount).toHaveBeenCalledTimes(1)
		const initialApp = onMount.mock.lastCall[0]
		jest.spyOn(initialApp, 'dispose')
		expect(initialApp.store).toBe(store)

		// re-render with the same store:
		rendered.rerender(
			<TldrawEditor
				store={store}
				shapes={DEFAULT_SHAPE_UTILS}
				tools={DEFAULT_TOOLS}
				onMount={onMount}
				autoFocus
			>
				<div data-testid="canvas-2" />
			</TldrawEditor>
		)
		await screen.findByTestId('canvas-2')
		// not called again:
		expect(onMount).toHaveBeenCalledTimes(1)

		// re-render with a new store:
		const newStore = createDefaultTldrawEditorStore({
			instanceId: InstanceRecordType.createCustomId('test'),
			userId: UserRecordType.createCustomId('test'),
		})

		rendered.rerender(
			<TldrawEditor
				shapes={DEFAULT_SHAPE_UTILS}
				tools={DEFAULT_TOOLS}
				store={newStore}
				onMount={onMount}
				autoFocus
			>
				<div data-testid="canvas-3" />
			</TldrawEditor>
		)
		await screen.findByTestId('canvas-3')
		expect(initialApp.dispose).toHaveBeenCalledTimes(1)
		expect(onMount).toHaveBeenCalledTimes(2)
		expect(onMount.mock.lastCall[0].store).toBe(newStore)
	})
})
