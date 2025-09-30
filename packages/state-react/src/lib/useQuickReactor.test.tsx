import { act, render, RenderResult } from '@testing-library/react'
import { atom, Atom } from '@tldraw/state'
import { useState } from 'react'
import { vi } from 'vitest'
import { useAtom } from './useAtom'
import { useQuickReactor } from './useQuickReactor'

describe('useQuickReactor', () => {
	let mockEffectFn: ReturnType<typeof vi.fn>
	let _component: () => React.JSX.Element
	let view: RenderResult

	beforeEach(() => {
		mockEffectFn = vi.fn()
		vi.clearAllMocks()
	})

	describe('basic functionality', () => {
		it('executes the effect function immediately on mount', async () => {
			function Component() {
				useQuickReactor('test-reactor', mockEffectFn, [])
				return <div>test</div>
			}

			await act(() => {
				render(<Component />)
			})

			expect(mockEffectFn).toHaveBeenCalledTimes(1)
		})

		it('executes the effect function immediately when tracked signals change', async () => {
			let theAtom: Atom<number>
			function Component() {
				theAtom = useAtom('counter', 0)
				useQuickReactor(
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

			// Change the atom value - should trigger immediate effect
			await act(() => {
				theAtom!.set(5)
			})

			expect(mockEffectFn).toHaveBeenCalledTimes(2)
			expect(mockEffectFn).toHaveBeenLastCalledWith(5)
		})

		it('works with external atoms not created via useAtom', async () => {
			const externalAtom = atom('external', 'initial')

			function Component() {
				useQuickReactor(
					'test-reactor',
					() => {
						mockEffectFn(externalAtom.get())
					},
					[]
				)
				return <div>test</div>
			}

			await act(() => {
				render(<Component />)
			})

			expect(mockEffectFn).toHaveBeenCalledWith('initial')

			await act(() => {
				externalAtom.set('changed')
			})

			expect(mockEffectFn).toHaveBeenCalledTimes(2)
			expect(mockEffectFn).toHaveBeenLastCalledWith('changed')
		})
	})

	describe('dependency array behavior', () => {
		it('recreates the reactor when dependencies change', async () => {
			const dep = 'dep1'
			let setDep: (newDep: string) => void
			const reactorExecutions: string[] = []

			function Component() {
				const [currentDep, setCurrentDep] = useState(dep)
				setDep = setCurrentDep

				useQuickReactor(
					'test-reactor',
					() => {
						reactorExecutions.push(`executed with ${currentDep}`)
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
			expect(reactorExecutions).toEqual(['executed with dep1'])

			// Change dependency - should recreate reactor
			await act(() => {
				setDep('dep2')
			})

			expect(mockEffectFn).toHaveBeenCalledTimes(2)
			expect(mockEffectFn).toHaveBeenLastCalledWith('dep2')
			expect(reactorExecutions).toEqual(['executed with dep1', 'executed with dep2'])
		})
	})

	describe('cleanup behavior', () => {
		it('cleans up the effect scheduler when component unmounts', async () => {
			let theAtom: Atom<number>
			let isUnmounted = false

			function Component() {
				theAtom = useAtom('counter', 0)
				useQuickReactor(
					'test-reactor',
					() => {
						if (isUnmounted) {
							mockEffectFn('should-not-execute')
						} else {
							mockEffectFn(theAtom.get())
						}
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
				isUnmounted = true
			})

			// Try to change the atom after unmount - effect should not run
			await act(() => {
				theAtom!.set(10)
			})

			// Should still only have been called once (during mount)
			expect(mockEffectFn).toHaveBeenCalledTimes(1)
			expect(mockEffectFn).not.toHaveBeenCalledWith('should-not-execute')
		})

		it('cleans up the previous scheduler when dependencies change', async () => {
			const dep = 1
			let setDep: (newDep: number) => void
			const oldAtom = atom('old', 'old-value')
			const newAtom = atom('new', 'new-value')

			function Component() {
				const [currentDep, setCurrentDep] = useState(dep)
				setDep = setCurrentDep

				useQuickReactor(
					'test-reactor',
					() => {
						const atomToUse = currentDep === 1 ? oldAtom : newAtom
						mockEffectFn(atomToUse.get())
					},
					[currentDep]
				)

				return <div>dep: {currentDep}</div>
			}

			await act(() => {
				render(<Component />)
			})

			expect(mockEffectFn).toHaveBeenCalledWith('old-value')

			// Change the old atom - should trigger effect
			await act(() => {
				oldAtom.set('old-updated')
			})

			expect(mockEffectFn).toHaveBeenCalledTimes(2)
			expect(mockEffectFn).toHaveBeenLastCalledWith('old-updated')

			// Change dependency - should cleanup old scheduler and create new one
			await act(() => {
				setDep(2)
			})

			expect(mockEffectFn).toHaveBeenCalledTimes(3)
			expect(mockEffectFn).toHaveBeenLastCalledWith('new-value')

			// Old atom changes should no longer trigger effects
			await act(() => {
				oldAtom.set('old-should-not-trigger')
			})

			expect(mockEffectFn).toHaveBeenCalledTimes(3) // No additional calls

			// New atom changes should trigger effects
			await act(() => {
				newAtom.set('new-updated')
			})

			expect(mockEffectFn).toHaveBeenCalledTimes(4)
			expect(mockEffectFn).toHaveBeenLastCalledWith('new-updated')
		})
	})

	describe('multiple reactors', () => {
		it('supports multiple reactors in the same component', async () => {
			let atom1: Atom<number>
			let atom2: Atom<string>
			const effect1 = vi.fn()
			const effect2 = vi.fn()

			function Component() {
				atom1 = useAtom('atom1', 1)
				atom2 = useAtom('atom2', 'a')

				useQuickReactor(
					'reactor1',
					() => {
						effect1(atom1.get())
					},
					[]
				)

				useQuickReactor(
					'reactor2',
					() => {
						effect2(atom2.get())
					},
					[]
				)

				return (
					<div>
						{atom1.get()} {atom2.get()}
					</div>
				)
			}

			await act(() => {
				render(<Component />)
			})

			expect(effect1).toHaveBeenCalledWith(1)
			expect(effect2).toHaveBeenCalledWith('a')

			// Change first atom
			await act(() => {
				atom1!.set(2)
			})

			expect(effect1).toHaveBeenCalledTimes(2)
			expect(effect1).toHaveBeenLastCalledWith(2)
			expect(effect2).toHaveBeenCalledTimes(1) // Should not be affected

			// Change second atom
			await act(() => {
				atom2!.set('b')
			})

			expect(effect1).toHaveBeenCalledTimes(2) // Should not be affected
			expect(effect2).toHaveBeenCalledTimes(2)
			expect(effect2).toHaveBeenLastCalledWith('b')
		})
	})

	describe('complex scenarios', () => {
		it('handles complex dependency tracking with multiple atoms', async () => {
			let atom1: Atom<number>
			let atom2: Atom<number>
			let atom3: Atom<number>

			function Component() {
				atom1 = useAtom('a', 1)
				atom2 = useAtom('b', 2)
				atom3 = useAtom('c', 3)

				useQuickReactor(
					'complex-reactor',
					() => {
						const sum = atom1.get() + atom2.get() + atom3.get()
						mockEffectFn(sum)
					},
					[]
				)

				return <div>sum</div>
			}

			await act(() => {
				render(<Component />)
			})

			expect(mockEffectFn).toHaveBeenCalledWith(6) // 1 + 2 + 3

			// Change each atom individually
			await act(() => {
				atom1!.set(10)
			})
			expect(mockEffectFn).toHaveBeenLastCalledWith(15) // 10 + 2 + 3

			await act(() => {
				atom2!.set(20)
			})
			expect(mockEffectFn).toHaveBeenLastCalledWith(33) // 10 + 20 + 3

			await act(() => {
				atom3!.set(30)
			})
			expect(mockEffectFn).toHaveBeenLastCalledWith(60) // 10 + 20 + 30

			expect(mockEffectFn).toHaveBeenCalledTimes(4)
		})

		it('works with conditional atom access', async () => {
			let toggleAtom: Atom<boolean>
			let atom1: Atom<string>
			let atom2: Atom<string>

			function Component() {
				toggleAtom = useAtom('toggle', true)
				atom1 = useAtom('atom1', 'value1')
				atom2 = useAtom('atom2', 'value2')

				useQuickReactor(
					'conditional-reactor',
					() => {
						const useFirst = toggleAtom.get()
						const value = useFirst ? atom1.get() : atom2.get()
						mockEffectFn(value)
					},
					[]
				)

				return <div>conditional</div>
			}

			await act(() => {
				render(<Component />)
			})

			expect(mockEffectFn).toHaveBeenCalledWith('value1')

			// Change atom1 - should trigger since toggle is true
			await act(() => {
				atom1!.set('new-value1')
			})
			expect(mockEffectFn).toHaveBeenCalledWith('new-value1')

			// Change atom2 - should NOT trigger since toggle is true
			await act(() => {
				atom2!.set('new-value2')
			})
			expect(mockEffectFn).toHaveBeenCalledTimes(2) // No new call

			// Toggle to false - should now use atom2
			await act(() => {
				toggleAtom!.set(false)
			})
			expect(mockEffectFn).toHaveBeenCalledWith('new-value2')

			// Now changes to atom1 should not trigger
			await act(() => {
				atom1!.set('ignored-value1')
			})
			expect(mockEffectFn).toHaveBeenCalledTimes(3) // No new call

			// But changes to atom2 should trigger
			await act(() => {
				atom2!.set('final-value2')
			})
			expect(mockEffectFn).toHaveBeenCalledWith('final-value2')
			expect(mockEffectFn).toHaveBeenCalledTimes(4)
		})
	})
})
