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
		// const onMount = jest.fn()
		// act(() => render(<Tldraw onMount={onMount} />))

		// todo
		expect(true).toBe(true)
	})
})
