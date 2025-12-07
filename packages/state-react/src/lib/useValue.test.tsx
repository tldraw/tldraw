import { RenderResult, act, render } from '@testing-library/react'
import { Atom, Computed, atom } from '@tldraw/state'
import { Component, ReactNode, useState } from 'react'
import { vi } from 'vitest'
import { useAtom } from './useAtom'
import { useComputed } from './useComputed'
import { useValue } from './useValue'

// Error boundary component for testing
class TestErrorBoundary extends Component<
	{ children: ReactNode; onError?(error: Error): void },
	{ hasError: boolean; error: Error | null }
> {
	constructor(props: { children: ReactNode; onError?(error: Error): void }) {
		super(props)
		this.state = { hasError: false, error: null }
	}

	static getDerivedStateFromError(error: Error) {
		return { hasError: true, error }
	}

	override componentDidCatch(error: Error) {
		this.props.onError?.(error)
	}

	override render() {
		if (this.state.hasError) {
			return <div data-testid="error-boundary">Error: {this.state.error?.message}</div>
		}
		return this.props.children
	}
}

test('useValue returns a value from a computed', async () => {
	let theComputed = null as null | Computed<number>
	let theAtom = null as null | Atom<number>
	function Component() {
		const a = useAtom('a', 1)
		theAtom = a
		const b = useComputed('a+1', () => a.get() + 1, [])
		theComputed = b
		return <>{useValue(b)}</>
	}

	let view: RenderResult
	await act(() => {
		view = render(<Component />)
	})

	expect(theComputed).not.toBeNull()
	expect(theComputed?.get()).toBe(2)
	expect(theComputed?.name).toBe('useComputed(a+1)')
	expect(view!.asFragment().textContent).toMatchInlineSnapshot(`"2"`)

	await act(() => {
		theAtom?.set(5)
	})
	expect(view!.asFragment().textContent).toMatchInlineSnapshot(`"6"`)
})

test('useValue returns a value from an atom', async () => {
	let theAtom = null as null | Atom<number>
	function Component() {
		const a = useAtom('a', 1)
		theAtom = a
		return <>{useValue(a)}</>
	}

	let view: RenderResult
	await act(() => {
		view = render(<Component />)
	})

	expect(view!.asFragment().textContent).toMatchInlineSnapshot(`"1"`)

	await act(() => {
		theAtom?.set(5)
	})
	expect(view!.asFragment().textContent).toMatchInlineSnapshot(`"5"`)
})

test('useValue returns a value from a compute function', async () => {
	let theAtom = null as null | Atom<number>
	let setB = null as null | ((b: number) => void)
	function Component() {
		const a = useAtom('a', 1)
		const [b, _setB] = useState(1)
		setB = _setB
		theAtom = a
		const c = useValue('a+b', () => a.get() + b, [b])
		return <>{c}</>
	}

	let view: RenderResult
	await act(() => {
		view = render(<Component />)
	})

	expect(view!.asFragment().textContent).toMatchInlineSnapshot(`"2"`)

	await act(() => {
		theAtom?.set(5)
	})
	expect(view!.asFragment().textContent).toMatchInlineSnapshot(`"6"`)

	await act(() => {
		setB!(5)
	})
	expect(view!.asFragment().textContent).toMatchInlineSnapshot(`"10"`)
})

test("useValue doesn't throw when used in a zombie-child component", async () => {
	const theAtom = atom<Record<string, number>>('map', { a: 1, b: 2, c: 3 })
	let numThrows = 0
	function Parent() {
		const ids = useValue('ids', () => Object.keys(theAtom.get()), [])
		return (
			<>
				{ids.map((id) => (
					<Child key={id} id={id} />
				))}
			</>
		)
	}
	function Child({ id }: { id: string }) {
		const value = useValue(
			'value',
			() => {
				if (!(id in theAtom.get())) {
					numThrows++
					throw new Error('id not found!')
				}
				return theAtom.get()[id]
			},
			[id]
		)
		return <>{value}</>
	}

	let view: RenderResult
	act(() => {
		view = render(<Parent />)
	})

	expect(view!.asFragment().textContent).toMatchInlineSnapshot('"123"')

	expect(numThrows).toBe(0)
	// remove id 'b' creating a zombie-child
	act(() => {
		theAtom?.update(({ b: _, ...rest }) => rest)
	})

	expect(view!.asFragment().textContent).toMatchInlineSnapshot('"13"')

	expect(numThrows).toBe(1)
})

test('useValue throws synchronously during render when the computed throws', async () => {
	const theAtom = atom<Error | null>('map', null)
	let caughtError = null as null | Error

	// Suppress React's console.error for this test

	function Component({ id }: { id: string }) {
		const value = useValue(
			'value',
			() => {
				const error = theAtom.get()
				if (error) throw error
				return 1
			},
			[id]
		)
		return <>{value}</>
	}

	let view: RenderResult
	act(() => {
		view = render(
			<TestErrorBoundary
				onError={(error) => {
					caughtError = error
				}}
			>
				<Component id="a" />
			</TestErrorBoundary>
		)
	})

	expect(view!.asFragment().textContent).toMatchInlineSnapshot('"1"')

	// ignore console.error here because react will log the error to console.error
	// even though it's caught by the error boundary
	const originalError = console.error
	console.error = vi.fn()
	try {
		act(() => {
			theAtom.set(new Error('test'))
		})
	} finally {
		console.error = originalError
	}

	expect(caughtError).toBeInstanceOf(Error)
	expect(caughtError?.message).toBe('test')
	expect(view!.getByTestId('error-boundary')).toBeTruthy()
	expect(view!.getByTestId('error-boundary').textContent).toBe('Error: test')
})
