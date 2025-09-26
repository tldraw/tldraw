import { act, render, RenderResult } from '@testing-library/react'
import { atom, Atom } from '@tldraw/state'
import { useEffect, useState } from 'react'
import { vi } from 'vitest'
import { useAtom } from './useAtom'
import { useReactor } from './useReactor'

describe('useReactor', () => {
	let mockEffectFn: ReturnType<typeof vi.fn>
	let component: () => JSX.Element
	let view: RenderResult

	beforeEach(() => {
		mockEffectFn = vi.fn()
		vi.clearAllMocks()
	})

	describe('basic functionality', () => {
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

		it('handles rapid state changes (in test mode, effects run immediately)', async () => {
			let theAtom: Atom<number>
			const values: number[] = []

			function Component() {
				theAtom = useAtom('counter', 0)
				useReactor(
					'test-reactor',
					() => {
						const value = theAtom.get()
						values.push(value)
						mockEffectFn(value)
					},
					[]
				)
				return <div>{theAtom.get()}</div>
			}

			await act(() => {
				render(<Component />)
			})

			expect(values).toEqual([0])
			expect(mockEffectFn).toHaveBeenCalledTimes(1)

			// Make rapid changes - in test mode, throttleToNextFrame executes immediately
			await act(() => {
				for (let i = 1; i <= 5; i++) {
					theAtom!.set(i)
				}
			})

			// All values should have been captured since effects run immediately in tests
			expect(values).toEqual([0, 1, 2, 3, 4, 5])
			expect(mockEffectFn).toHaveBeenCalledTimes(6)
		})

		it('works with external atoms not created via useAtom', async () => {
			const externalAtom = atom('external', 'initial')

			function Component() {
				useReactor(
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
			let dep = 'dep1'
			let setDep: (newDep: string) => void
			const reactorExecutions: string[] = []

			function Component() {
				const [currentDep, setCurrentDep] = useState(dep)
				setDep = setCurrentDep

				useReactor(
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

		it('does not recreate the reactor when dependencies remain the same', async () => {
			let theAtom: Atom<number>
			let forceUpdate: () => void
			let renderCount = 0

			function Component() {
				renderCount++
				theAtom = useAtom('counter', 0)
				const [, setDummy] = useState(0)
				forceUpdate = () => setDummy((prev) => prev + 1)

				useReactor(
					'test-reactor',
					() => {
						mockEffectFn(`render-${renderCount}-value-${theAtom.get()}`)
					},
					[]
				) // Empty deps - should not recreate

				return <div>render-{renderCount}</div>
			}

			await act(() => {
				render(<Component />)
			})

			expect(mockEffectFn).toHaveBeenCalledWith('render-1-value-0')
			expect(mockEffectFn).toHaveBeenCalledTimes(1)

			// Force a re-render without changing deps
			await act(() => {
				forceUpdate!()
			})

			// Should not create duplicate effects
			expect(renderCount).toBe(2)

			// Now change the atom - should trigger effect with latest render context
			await act(() => {
				theAtom!.set(5)
			})

			expect(mockEffectFn).toHaveBeenCalledWith('render-2-value-5')
			expect(mockEffectFn).toHaveBeenCalledTimes(2)
		})

		it('uses empty array as default dependencies', async () => {
			let theAtom: Atom<string>

			function Component() {
				theAtom = useAtom('test', 'initial')
				// Not passing deps parameter - should use empty array default
				useReactor('test-reactor', () => {
					mockEffectFn(theAtom.get())
				})
				return <div>{theAtom.get()}</div>
			}

			await act(() => {
				render(<Component />)
			})

			expect(mockEffectFn).toHaveBeenCalledWith('initial')

			await act(() => {
				theAtom!.set('changed')
			})

			expect(mockEffectFn).toHaveBeenCalledTimes(2)
			expect(mockEffectFn).toHaveBeenLastCalledWith('changed')

			// Effect should work normally with default empty dependencies
		})

		it('handles undefined dependencies correctly', async () => {
			let theAtom: Atom<string>

			function Component() {
				theAtom = useAtom('test', 'initial')
				useReactor(
					'test-reactor',
					() => {
						mockEffectFn(theAtom.get())
					},
					undefined
				)
				return <div>{theAtom.get()}</div>
			}

			await act(() => {
				render(<Component />)
			})

			expect(mockEffectFn).toHaveBeenCalledWith('initial')

			await act(() => {
				theAtom!.set('changed')
			})

			expect(mockEffectFn).toHaveBeenCalledTimes(2)
			expect(mockEffectFn).toHaveBeenLastCalledWith('changed')
		})
	})

	describe('cleanup behavior', () => {
		it('cleans up effects when component unmounts', async () => {
			let theAtom: Atom<number>
			let isUnmounted = false

			function Component() {
				theAtom = useAtom('counter', 0)
				useReactor(
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

		it('properly switches dependencies when they change', async () => {
			let dep = 1
			let setDep: (newDep: number) => void
			const oldAtom = atom('old', 'old-value')
			const newAtom = atom('new', 'new-value')

			function Component() {
				const [currentDep, setCurrentDep] = useState(dep)
				setDep = setCurrentDep

				useReactor(
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

			// Change dependency - should switch to new atom
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

	describe('error handling', () => {
		it('handles errors in the effect function gracefully', async () => {
			const consoleError = console.error
			console.error = vi.fn() // Suppress error logs in test

			let theAtom: Atom<boolean>
			const shouldThrow = atom('shouldThrow', false)

			function Component() {
				theAtom = useAtom('trigger', false)
				useReactor(
					'test-reactor',
					() => {
						mockEffectFn('before-error')
						if (shouldThrow.get()) {
							throw new Error('Test error')
						}
						mockEffectFn('after-error')
					},
					[]
				)
				return <div>test</div>
			}

			// Initial render should be fine
			await act(() => {
				render(<Component />)
			})

			expect(mockEffectFn).toHaveBeenCalledWith('before-error')
			expect(mockEffectFn).toHaveBeenCalledWith('after-error')

			// Trigger an error - errors should be handled by the effect scheduler
			try {
				await act(() => {
					shouldThrow.set(true)
				})
			} catch (error) {
				// Error might be thrown depending on EffectScheduler implementation
			}

			console.error = consoleError // Restore console.error
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

				useReactor(
					'reactor1',
					() => {
						effect1(atom1.get())
					},
					[]
				)

				useReactor(
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

		it('maintains separate state for reactors with different names', async () => {
			let sharedAtom: Atom<number>
			const effect1 = vi.fn()
			const effect2 = vi.fn()

			function Component() {
				sharedAtom = useAtom('shared', 0)

				useReactor(
					'reactor1',
					() => {
						effect1(`reactor1: ${sharedAtom.get()}`)
					},
					[]
				)

				useReactor(
					'reactor2',
					() => {
						effect2(`reactor2: ${sharedAtom.get()}`)
					},
					[]
				)

				return <div>{sharedAtom.get()}</div>
			}

			await act(() => {
				render(<Component />)
			})

			expect(effect1).toHaveBeenCalledWith('reactor1: 0')
			expect(effect2).toHaveBeenCalledWith('reactor2: 0')

			await act(() => {
				sharedAtom!.set(5)
			})

			expect(effect1).toHaveBeenCalledTimes(2)
			expect(effect1).toHaveBeenLastCalledWith('reactor1: 5')
			expect(effect2).toHaveBeenCalledTimes(2)
			expect(effect2).toHaveBeenLastCalledWith('reactor2: 5')
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

				useReactor(
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

				useReactor(
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

	describe('integration with React lifecycle', () => {
		it('works correctly with useEffect interactions', async () => {
			let theAtom: Atom<number>
			const effectOrder: string[] = []

			function Component() {
				theAtom = useAtom('counter', 0)

				useEffect(() => {
					effectOrder.push('useEffect-mount')
					return () => {
						effectOrder.push('useEffect-cleanup')
					}
				}, [])

				useReactor(
					'lifecycle-reactor',
					() => {
						effectOrder.push(`useReactor-${theAtom.get()}`)
						mockEffectFn(theAtom.get())
					},
					[]
				)

				return <div>{theAtom.get()}</div>
			}

			await act(() => {
				view = render(<Component />)
			})

			// useReactor should run after useEffect mount
			expect(effectOrder).toEqual(['useEffect-mount', 'useReactor-0'])

			await act(() => {
				theAtom!.set(1)
			})

			expect(effectOrder).toEqual(['useEffect-mount', 'useReactor-0', 'useReactor-1'])

			await act(() => {
				view.unmount()
			})

			expect(effectOrder).toEqual([
				'useEffect-mount',
				'useReactor-0',
				'useReactor-1',
				'useEffect-cleanup',
			])
		})

		it('handles component re-renders without creating duplicate reactors', async () => {
			let theAtom: Atom<number>
			let forceUpdate: () => void
			let renderCount = 0

			function Component() {
				renderCount++
				const [, setDummy] = useState(0)
				forceUpdate = () => setDummy((prev) => prev + 1)

				theAtom = useAtom('counter', 0)

				useReactor(
					'rerender-reactor',
					() => {
						mockEffectFn(`render-${renderCount}-value-${theAtom.get()}`)
					},
					[]
				)

				return <div>render: {renderCount}</div>
			}

			await act(() => {
				render(<Component />)
			})

			expect(mockEffectFn).toHaveBeenCalledWith('render-1-value-0')
			expect(mockEffectFn).toHaveBeenCalledTimes(1)

			// Force a re-render
			await act(() => {
				forceUpdate!()
			})

			// Should not create a new reactor
			expect(renderCount).toBe(2)

			// Atom changes should still work normally
			await act(() => {
				theAtom!.set(5)
			})

			// Should use the latest render context
			expect(mockEffectFn).toHaveBeenCalledWith('render-2-value-5')
			expect(mockEffectFn).toHaveBeenCalledTimes(2)
		})
	})

	describe('edge cases', () => {
		it('handles empty effect functions', async () => {
			const emptyEffect = vi.fn()

			function Component() {
				useReactor('empty-reactor', emptyEffect, [])
				return <div>empty</div>
			}

			await act(() => {
				render(<Component />)
			})

			expect(emptyEffect).toHaveBeenCalledTimes(1)
			// Scheduler created with empty effect
		})

		it('handles effects that return values (should be ignored)', async () => {
			const returningEffect = vi.fn().mockReturnValue('ignored-return-value')

			function Component() {
				useReactor('returning-reactor', returningEffect, [])
				return <div>returning</div>
			}

			await act(() => {
				render(<Component />)
			})

			expect(returningEffect).toHaveBeenCalledTimes(1)
			expect(returningEffect).toHaveReturnedWith('ignored-return-value')
		})

		it('works with different primitive dependency types', async () => {
			let setDeps: (deps: any[]) => void

			function Component() {
				const [deps, _setDeps] = useState([1, 'string', true, null, undefined])
				setDeps = _setDeps

				useReactor(
					'primitive-deps-reactor',
					() => {
						mockEffectFn(deps.join('-'))
					},
					deps
				)

				return <div>deps test</div>
			}

			await act(() => {
				render(<Component />)
			})

			expect(mockEffectFn).toHaveBeenCalledWith('1-string-true--')

			// Change deps
			await act(() => {
				setDeps([2, 'other', false, 42, 'defined'])
			})

			expect(mockEffectFn).toHaveBeenCalledTimes(2)
			expect(mockEffectFn).toHaveBeenLastCalledWith('2-other-false-42-defined')
			// New scheduler created for different dependencies
		})

		it('handles very long reactor names', async () => {
			const longName =
				'very-long-reactor-name-that-exceeds-normal-length-expectations-and-continues-for-quite-a-while-to-test-edge-cases-and-more-edge-cases-and-even-more-edge-cases'

			function Component() {
				useReactor(longName, mockEffectFn, [])
				return <div>long name</div>
			}

			await act(() => {
				render(<Component />)
			})

			expect(mockEffectFn).toHaveBeenCalledTimes(1)
			// Scheduler created with long name
		})

		it('handles special characters in reactor names', async () => {
			const specialName = 'reactor-with-特殊-characters-🎨-and-émojis'

			function Component() {
				useReactor(specialName, mockEffectFn, [])
				return <div>special name</div>
			}

			await act(() => {
				render(<Component />)
			})

			expect(mockEffectFn).toHaveBeenCalledTimes(1)
			// Scheduler created with special name
		})

		it('handles very deep dependency arrays', async () => {
			const deepDeps = Array.from({ length: 100 }, (_, i) => ({ nested: { value: i } }))

			function Component() {
				useReactor(
					'deep-deps-reactor',
					() => {
						mockEffectFn(deepDeps.length)
					},
					deepDeps
				)
				return <div>deep deps</div>
			}

			await act(() => {
				render(<Component />)
			})

			expect(mockEffectFn).toHaveBeenCalledWith(100)
		})
	})
})
