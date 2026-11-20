import { act, render } from '@testing-library/react'
import { Box, Editor, createTLStore } from '@tldraw/editor'
import { vi } from 'vitest'
import { defaultShapeUtils } from './defaultShapeUtils'
import { TldrawImage } from './TldrawImage'

const snapshot = createTLStore({ shapeUtils: defaultShapeUtils }).getStoreSnapshot()

function deferred<T>() {
	let resolve!: (value: T) => void
	const promise = new Promise<T>((r) => (resolve = r))
	return { promise, resolve }
}

describe('TldrawImage', () => {
	let exports: ReturnType<typeof deferred<Awaited<ReturnType<Editor['toImage']>>>>[]
	let disposeSpy: ReturnType<typeof vi.spyOn>

	beforeEach(() => {
		exports = []
		vi.spyOn(Editor.prototype, 'toImage').mockImplementation(() => {
			const d = deferred<Awaited<ReturnType<Editor['toImage']>>>()
			exports.push(d)
			return d.promise
		})
		disposeSpy = vi.spyOn(Editor.prototype, 'dispose')
		globalThis.URL.createObjectURL ??= () => 'blob:test'
		globalThis.URL.revokeObjectURL ??= () => {}
	})

	afterEach(() => {
		vi.restoreAllMocks()
	})

	const result = () => ({ blob: new Blob(), width: 1, height: 1 })

	it('disposes the editor and removes its temporary element for every run', async () => {
		const { container, rerender, unmount } = render(
			<TldrawImage snapshot={snapshot} bounds={new Box(0, 0, 100, 100)} />
		)
		rerender(<TldrawImage snapshot={snapshot} bounds={new Box(0, 0, 100, 100)} />)
		rerender(<TldrawImage snapshot={snapshot} bounds={new Box(0, 0, 100, 100)} />)
		expect(exports).toHaveLength(3)

		await act(async () => {
			exports[0].resolve(result())
			exports[1].resolve(undefined as any)
			exports[2].resolve(result())
		})

		expect(disposeSpy).toHaveBeenCalledTimes(3)
		const root = container.firstElementChild!
		expect([...root.children].map((c) => c.tagName)).toEqual(['IMG'])

		unmount()
	})

	it('cleans up a run whose export is still in flight on unmount', async () => {
		const { unmount } = render(<TldrawImage snapshot={snapshot} />)
		unmount()
		await act(async () => {
			exports[0].resolve(result())
		})
		expect(disposeSpy).toHaveBeenCalledTimes(1)
	})
})
