import { RenderResult, act, render } from '@testing-library/react'
import { atom } from '@tldraw/state'
import { createRef, forwardRef, memo, useEffect, useImperativeHandle } from 'react'
import { track } from './track'

test("tracked components are memo'd", async () => {
	let numRenders = 0
	const Component = track(function Component({ a, b, c }: { a: string; b: string; c: string }) {
		numRenders++
		return (
			<>
				{a}
				{b}
				{c}
			</>
		)
	})

	let view: RenderResult
	await act(() => {
		view = render(<Component a="a" b="b" c="c" />)
	})

	expect(view!.asFragment().textContent).toMatchInlineSnapshot('"abc"')

	expect(numRenders).toBe(1)

	await act(() => {
		view!.rerender(<Component a="a" b="b" c="c" />)
	})

	expect(numRenders).toBe(1)

	await act(() => {
		view!.rerender(<Component a="a" b="b" c="d" />)
	})

	expect(numRenders).toBe(2)

	expect(view!.asFragment().textContent).toMatchInlineSnapshot('"abd"')
})

test("it's fine to call track on components that are already memo'd", async () => {
	let numRenders = 0
	const Component = track(
		memo(function Component({ a, b, c }: { a: string; b: string; c: string }) {
			numRenders++
			return (
				<>
					{a}
					{b}
					{c}
				</>
			)
		})
	)

	let view: RenderResult
	await act(() => {
		view = render(<Component a="a" b="b" c="c" />)
	})

	expect(view!.asFragment().textContent).toMatchInlineSnapshot('"abc"')

	expect(numRenders).toBe(1)

	await act(() => {
		view!.rerender(<Component a="a" b="b" c="c" />)
	})

	expect(numRenders).toBe(1)

	await act(() => {
		view!.rerender(<Component a="a" b="b" c="d" />)
	})

	expect(numRenders).toBe(2)

	expect(view!.asFragment().textContent).toMatchInlineSnapshot('"abd"')
})

test('tracked components can use refs', async () => {
	const Component = track(
		forwardRef<{ handle: string }, { prop: string }>(function Component({ prop }, ref) {
			useImperativeHandle(ref, () => ({ handle: prop }), [prop])
			return <>output</>
		})
	)

	const ref = createRef<{ handle: string }>()

	let view: RenderResult
	await act(() => {
		view = render(<Component prop="hello" ref={ref} />)
	})

	expect(view!.asFragment().textContent).toMatchInlineSnapshot('"output"')

	expect(ref.current?.handle).toBe('hello')

	await act(() => {
		view.rerender(<Component prop="world" ref={ref} />)
	})

	expect(view!.asFragment().textContent).toMatchInlineSnapshot('"output"')

	expect(ref.current?.handle).toBe('world')
})

test('tracked components update when the state they reference updates', async () => {
	const a = atom('a', 1)

	const C = track(function Component() {
		return <>{a.get()}</>
	})

	let view: RenderResult

	await act(() => {
		view = render(<C />)
	})

	expect(view!.asFragment().textContent).toMatchInlineSnapshot(`"1"`)

	await act(() => {
		a.set(2)
	})

	expect(view!.asFragment().textContent).toMatchInlineSnapshot(`"2"`)
})

test('things referenced in effects do not trigger updates', async () => {
	const a = atom('a', 1)
	let numRenders = 0

	const Component = track(function Component() {
		numRenders++
		useEffect(() => {
			a.get()
		}, [])
		return <>hi</>
	})

	let view: RenderResult

	await act(() => {
		view = render(<Component />)
	})

	expect(view!.asFragment().textContent).toMatchInlineSnapshot(`"hi"`)
	expect(numRenders).toBe(1)

	await act(() => {
		a.set(2)
	})

	expect(numRenders).toBe(1)
	expect(view!.asFragment().textContent).toMatchInlineSnapshot(`"hi"`)
})

test("tracked zombie-children don't throw", async () => {
	const theAtom = atom<Record<string, number>>('map', { a: 1, b: 2, c: 3 })
	const Parent = track(function Parent() {
		const ids = Object.keys(theAtom.get())
		return (
			<>
				{ids.map((id) => (
					<Child key={id} id={id} />
				))}
			</>
		)
	})
	const Child = track(function Child({ id }: { id: string }) {
		if (!(id in theAtom.get())) throw new Error('id not found!')
		const value = theAtom.get()[id]
		return <>{value}</>
	})

	let view: RenderResult
	await act(() => {
		view = render(<Parent />)
	})

	expect(view!.asFragment().textContent).toMatchInlineSnapshot('"123"')

	// remove id 'b' creating a zombie-child
	await act(() => {
		theAtom?.update(({ b: _, ...rest }) => rest)
	})

	expect(view!.asFragment().textContent).toMatchInlineSnapshot('"13"')
})
