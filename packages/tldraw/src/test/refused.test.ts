import { TLRefusal } from '@tldraw/editor'
import { TestEditor } from './TestEditor'

function makeFeed() {
	const listeners = new Set<(refusal: TLRefusal) => void>()
	return {
		listeners,
		subscribe(listener: (refusal: TLRefusal) => void) {
			listeners.add(listener)
			return () => void listeners.delete(listener)
		},
		emit(refusal: TLRefusal) {
			for (const listener of listeners) listener(refusal)
		},
	}
}

describe('refused event', () => {
	it('re-emits a refusal from the store feed', () => {
		const feed = makeFeed()
		const editor = new TestEditor({}, { collaboration: { status: null, refusals: feed } })
		const seen: TLRefusal[] = []
		editor.on('refused', (refusal) => seen.push(refusal))

		feed.emit({ reason: 'not your page', ids: ['shape:a'], source: 'server' })
		feed.emit({ reason: 'again', source: 'server' })

		expect(seen).toEqual([
			{ reason: 'not your page', ids: ['shape:a'], source: 'server' },
			{ reason: 'again', source: 'server' },
		])
	})

	it('stops listening when the editor is disposed', () => {
		const feed = makeFeed()
		const editor = new TestEditor({}, { collaboration: { status: null, refusals: feed } })
		expect(feed.listeners.size).toBe(1)
		editor.dispose()
		expect(feed.listeners.size).toBe(0)
	})

	it('works with no feed', () => {
		const editor = new TestEditor()
		expect(() => editor.dispose()).not.toThrow()
	})
})
