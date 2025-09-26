import { act, render, RenderResult } from '@testing-library/react'
import { atom } from '@tldraw/state'
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
