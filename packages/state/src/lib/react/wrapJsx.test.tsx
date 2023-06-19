/*
  @jsx testjsx
	@jsxFrag Fragment
*/

import {
	createElement,
	createRef,
	forwardRef,
	Fragment,
	memo,
	useEffect,
	useImperativeHandle,
} from 'react'
import { act, create, ReactTestRenderer } from 'react-test-renderer'
import { atom } from '../core/Atom'
import { wrapJsx } from './wrapJsx'

// assign this to an unused variable to prevent editors from removing it
const _Fragment = Fragment
const testjsx = wrapJsx(createElement)

test('components can use refs', async () => {
	const a = atom('a', 1)
	const Component = forwardRef<{ handle: string }, { prop: string }>(function Component(
		{ prop },
		ref
	) {
		useImperativeHandle(ref, () => ({ handle: prop }), [prop])
		return <>{a.value}</>
	})

	const ref = createRef<{ handle: string }>()

	let view: ReactTestRenderer
	await act(() => {
		view = create(<Component prop="hello" ref={ref} />)
	})

	expect(view!.toJSON()).toMatchInlineSnapshot('"1"')

	expect(ref.current?.handle).toBe('hello')

	await act(() => {
		view.update(<Component prop="world" ref={ref} />)
	})

	expect(view!.toJSON()).toMatchInlineSnapshot('"1"')

	expect(ref.current?.handle).toBe('world')

	await act(() => {
		a.set(2)
	})

	expect(view!.toJSON()).toMatchInlineSnapshot('"2"')

	expect(ref.current?.handle).toBe('world')
})

test('components update when the state they refernce updates', async () => {
	const a = atom('a', 1)

	const C = function Component() {
		return <>{a.value}</>
	}

	let view: ReactTestRenderer

	await act(() => {
		view = create(<C />)
	})

	expect(view!.toJSON()).toMatchInlineSnapshot(`"1"`)

	await act(() => {
		a.set(2)
	})

	expect(view!.toJSON()).toMatchInlineSnapshot(`"2"`)
})

test("components can be memo'd", async () => {
	const a = atom('a', 1)

	const C = memo(function Component() {
		return <>{a.value}</>
	})

	let view: ReactTestRenderer

	await act(() => {
		view = create(<C />)
	})

	expect(view!.toJSON()).toMatchInlineSnapshot(`"1"`)

	await act(() => {
		a.set(2)
	})

	expect(view!.toJSON()).toMatchInlineSnapshot(`"2"`)
})

test('things referenced in effects do not trigger updates', async () => {
	const a = atom('a', 1)
	let numRenders = 0

	function Component() {
		numRenders++
		useEffect(() => {
			a.value
		}, [])
		return <>hi</>
	}

	let view: ReactTestRenderer

	await act(() => {
		view = create(<Component />)
	})

	expect(view!.toJSON()).toMatchInlineSnapshot(`"hi"`)
	expect(numRenders).toBe(1)

	await act(() => {
		a.set(2)
	})

	expect(numRenders).toBe(1)
	expect(view!.toJSON()).toMatchInlineSnapshot(`"hi"`)
})
