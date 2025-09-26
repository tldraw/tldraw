import { act, render, RenderResult } from '@testing-library/react'
import { atom } from '@tldraw/state'
import { sleep } from '@tldraw/utils'
import * as React from 'react'
import { useStateTracking } from './useStateTracking'

describe('useStateTracking', () => {
	it('causes a rerender when a dependency changes', async () => {
		const a = atom('', 0)

		const Component = () => {
			const val = useStateTracking('', () => {
				return a.get()
			})
			return <>You are {val} years old</>
		}

		let view: RenderResult
		await act(() => {
			view = render(<Component />)
		})
		expect(view!.asFragment().textContent).toMatchInlineSnapshot('"You are 0 years old"')

		act(() => {
			a.set(1)
		})

		expect(view!.asFragment().textContent).toMatchInlineSnapshot('"You are 1 years old"')
	})

	it('allows using hooks inside the callback', async () => {
		const _age = atom('', 0)
		let setHeight: (height: number) => void

		const Component = () => {
			let height
			const age = useStateTracking('', () => {
				// eslint-disable-next-line react-hooks/rules-of-hooks
				;[height, setHeight] = React.useState(20)
				return _age.get()
			})
			return (
				<>
					You are {age} years old and {height} meters tall
				</>
			)
		}

		let view: RenderResult
		await act(() => {
			view = render(<Component />)
		})

		expect(view!.asFragment().textContent).toMatchInlineSnapshot(
			'"You are 0 years old and 20 meters tall"'
		)

		act(() => {
			_age.set(1)
		})

		expect(view!.asFragment().textContent).toMatchInlineSnapshot(
			'"You are 1 years old and 20 meters tall"'
		)

		act(() => {
			setHeight(21)
		})

		expect(view!.asFragment().textContent).toMatchInlineSnapshot(
			'"You are 1 years old and 21 meters tall"'
		)
	})

	it('allows throwing promises to trigger suspense boundaries', async () => {
		const a = atom<null | number>('age', null)

		let resolve = (_val: string) => {
			// noop
		}

		const Component = () => {
			const val = useStateTracking('', () => {
				if (a.get() === null) {
					throw new Promise<string>((r) => {
						resolve = r
					})
				}
				return a.get()
			})
			return <>You are {val} years old</>
		}

		let view: RenderResult = null as any
		await act(() => {
			view = render(
				<React.Suspense fallback={<>fallback</>}>
					<Component />
				</React.Suspense>
			)
		})

		expect(view.asFragment().textContent).toMatchInlineSnapshot(`"fallback"`)

		await act(() => {
			a.set(1)
		})
		// merely setting the value won't trigger a rerender, the promise must resolve
		expect(view.asFragment().textContent).toMatchInlineSnapshot(`"fallback"`)

		await act(() => {
			resolve('resolved')
		})

		await sleep(0)

		expect(view.asFragment().textContent).toMatchInlineSnapshot('"You are 1 years old"')
	})

	it('stops reacting when the component unmounts', async () => {
		const a = atom('', 0)
		let numRenders = 0
		const Component = () => {
			const val = useStateTracking('', () => {
				numRenders++
				return a.get()
			})
			return <>You are {val} years old</>
		}

		let view: RenderResult
		await act(() => {
			view = render(React.createElement(Component))
		})

		expect(view!.asFragment().textContent).toMatchInlineSnapshot('"You are 0 years old"')

		expect(numRenders).toBe(1)

		await act(() => {
			a.set(1)
		})

		expect(view!.asFragment().textContent).toMatchInlineSnapshot('"You are 1 years old"')

		expect(numRenders).toBe(2)

		await act(() => {
			view!.unmount()
		})

		await act(() => {
			a.set(2)
		})

		expect(numRenders).toBe(2)
	})
})
