import { act } from '@testing-library/react'
import { Tldraw } from './Tldraw'

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

describe('<Tldraw />', () => {
	it('Renders without crashing', async () => {
		await act(async () => (
			<Tldraw>
				<div data-testid="canvas-1" />
			</Tldraw>
		))
	})
})
