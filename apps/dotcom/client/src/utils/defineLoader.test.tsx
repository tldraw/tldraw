import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { createMemoryRouter, Outlet, RouterProvider } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineLoader } from './defineLoader'

beforeEach(() => {
	vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
})

afterEach(() => {
	vi.unstubAllGlobals()
})

async function renderLoader(run: () => Promise<unknown>) {
	const { loader, useMaybeData } = defineLoader(run)
	function Page() {
		const data = useMaybeData()
		return <div>data:{JSON.stringify(data)}</div>
	}

	const router = createMemoryRouter(
		[
			{
				path: '/',
				element: <Outlet />,
				errorElement: <div>root error</div>,
				children: [
					{
						path: 'test',
						loader,
						element: <Page />,
						errorElement: (
							<div>
								local error
								<Page />
							</div>
						),
					},
				],
			},
		],
		{ initialEntries: ['/test'] }
	)
	const container = document.createElement('div')
	const root = createRoot(container)
	try {
		await act(async () => {
			root.render(<RouterProvider router={router} future={{ v7_startTransition: true }} />)
		})
		return container.textContent
	} finally {
		await act(async () => root.unmount())
		router.dispose()
	}
}

describe('useMaybeData', () => {
	it('preserves successful loader data when there is no route error', async () => {
		expect(await renderLoader(async () => ({ value: 42 }))).toBe('data:{"value":42}')
	})

	it('preserves a successful null result', async () => {
		expect(await renderLoader(async () => null)).toBe('data:null')
	})

	it.each([new Error('Room not found'), new Response('Missing', { status: 404 })])(
		'renders the local error boundary without loader data after throwing %s',
		async (error) => {
			expect(
				await renderLoader(async () => {
					throw error
				})
			).toBe('local errordata:')
		}
	)
})
