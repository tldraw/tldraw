import { act, render, RenderResult } from '@testing-library/react'
import { Atom } from '@tldraw/state'
import { useState } from 'react'
import { vi } from 'vitest'
import { useAtom } from './useAtom'
import { useReactor } from './useReactor'

describe('useReactor', () => {
	let mockEffectFn: ReturnType<typeof vi.fn>
	let view: RenderResult

	beforeEach(() => {
		mockEffectFn = vi.fn()
		vi.clearAllMocks()
	})

	it('executes the effect function immediately on mount', async () => {
		function Component() {
			useReactor('test-reactor', mockEffectFn, [])
			return <div>test</div>
		}

		await act(() => {
			render(<Component />)
		})

		expect(mockEffectFn).toHaveBeenCalledTimes(1)
	})

	it('executes the effect function when tracked signals change', async () => {
		let theAtom: Atom<number>
		function Component() {
			theAtom = useAtom('counter', 0)
			useReactor(
				'test-reactor',
				() => {
					mockEffectFn(theAtom.get())
				},
				[]
			)
			return <div>{theAtom.get()}</div>
		}

		await act(() => {
			view = render(<Component />)
		})

		expect(mockEffectFn).toHaveBeenCalledTimes(1)
		expect(mockEffectFn).toHaveBeenLastCalledWith(0)

		// Change the atom value - should trigger throttled effect
		await act(() => {
			theAtom!.set(5)
		})

		// In test mode, throttleToNextFrame executes immediately
		expect(mockEffectFn).toHaveBeenCalledTimes(2)
		expect(mockEffectFn).toHaveBeenLastCalledWith(5)
	})

	it('recreates the reactor when dependencies change', async () => {
		let setDep: (newDep: string) => void

		function Component() {
			const [currentDep, setCurrentDep] = useState('dep1')
			setDep = setCurrentDep

			useReactor(
				'test-reactor',
				() => {
					mockEffectFn(currentDep)
				},
				[currentDep]
			)

			return <div>{currentDep}</div>
		}

		await act(() => {
			render(<Component />)
		})

		expect(mockEffectFn).toHaveBeenCalledWith('dep1')

		// Change dependency - should recreate reactor
		await act(() => {
			setDep('dep2')
		})

		expect(mockEffectFn).toHaveBeenCalledTimes(2)
		expect(mockEffectFn).toHaveBeenLastCalledWith('dep2')
	})

	it('cleans up effects when component unmounts', async () => {
		let theAtom: Atom<number>

		function Component() {
			theAtom = useAtom('counter', 0)
			useReactor(
				'test-reactor',
				() => {
					mockEffectFn(theAtom.get())
				},
				[]
			)
			return <div>{theAtom.get()}</div>
		}

		await act(() => {
			view = render(<Component />)
		})

		expect(mockEffectFn).toHaveBeenCalledWith(0)

		// Unmount the component
		await act(() => {
			view.unmount()
		})

		// Try to change the atom after unmount - effect should not run
		await act(() => {
			theAtom!.set(10)
		})

		// Should still only have been called once (during mount)
		expect(mockEffectFn).toHaveBeenCalledTimes(1)
	})
})
