import { atom, createShapeId, react, TLCheckDiff, TLShape } from '@tldraw/editor'
import { TestEditor } from './TestEditor'

const ids = {
	a: createShapeId('a'),
	b: createShapeId('b'),
}

function setup(checkDiff: TLCheckDiff) {
	const editor = new TestEditor({}, { checkDiff })
	const rejected: { reason: string; source: string }[] = []
	editor.on('rejected', (event) => rejected.push(event))
	return { editor, rejected }
}

describe('checkDiff in the editor', () => {
	it('reverts a rejected operation as a whole and emits rejected', async () => {
		const { editor, rejected } = setup((diff) => {
			if (ids.b in diff.added) {
				return { reason: 'no b' }
			}
		})

		editor.run(() => {
			editor.createShapes([{ id: ids.a, type: 'geo' }])
			editor.createShapes([{ id: ids.b, type: 'geo' }])
		})

		expect(editor.getShape(ids.a)).toBeUndefined()
		expect(editor.getShape(ids.b)).toBeUndefined()
		expect(rejected).toEqual([])
		await Promise.resolve()
		expect(rejected).toEqual([{ reason: 'no b', source: 'local' }])
	})

	it('keeps what a rejected listener changes', async () => {
		const { editor } = setup(() => false)
		const lastReason = atom<string | null>('last reason', null)
		editor.on('rejected', ({ reason }) => lastReason.set(reason))

		editor.createShapes([{ id: ids.a, type: 'geo' }])
		await Promise.resolve()

		expect(lastReason.get()).toBe('rejected')
	})

	it('keeps an allowed operation', () => {
		const { editor, rejected } = setup(() => {})
		editor.createShapes([{ id: ids.a, type: 'geo' }])
		expect(editor.getShape(ids.a)).toBeDefined()
		expect(rejected).toEqual([])
	})

	it('gives no undo entry for a rejected operation', () => {
		let allow = true
		const { editor } = setup(() => allow)
		editor.markHistoryStoppingPoint()
		editor.createShapes([{ id: ids.a, type: 'geo', x: 0 }])
		editor.markHistoryStoppingPoint()
		allow = false
		editor.updateShape({ id: ids.a, type: 'geo', x: 100 })
		expect(editor.getShape(ids.a)!.x).toBe(0)

		allow = true
		editor.undo()
		expect(editor.getShape(ids.a)).toBeUndefined()
	})

	it('treats false as a rejection and a throw as reason error', async () => {
		let result: () => boolean = () => false
		const { editor, rejected } = setup(() => result())
		editor.createShapes([{ id: ids.a, type: 'geo' }])

		const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
		result = () => {
			throw new Error('boom')
		}
		editor.createShapes([{ id: ids.a, type: 'geo' }])
		consoleError.mockRestore()

		expect(editor.getShape(ids.a)).toBeUndefined()
		await Promise.resolve()
		expect(rejected.map((r) => r.reason)).toEqual(['rejected', 'error'])
	})

	it('only gets document changes, and get reads the state before the operation', () => {
		const before: (TLShape | undefined)[] = []
		const typeNames = new Set<string>()
		const { editor } = setup((diff, { get }) => {
			for (const record of Object.values(diff.updated)) {
				typeNames.add(record[1].typeName)
			}
			if (ids.a in diff.updated) {
				before.push(get(ids.a) as TLShape | undefined)
			}
		})
		editor.createShapes([{ id: ids.a, type: 'geo', x: 0 }])
		editor.select(ids.a)
		editor.updateShape({ id: ids.a, type: 'geo', x: 100 })

		expect(before.map((shape) => shape?.x)).toEqual([0])
		expect(typeNames.has('instance_page_state')).toBe(false)
	})

	it('does not check what side effects write in response to remote changes', () => {
		let allow = true
		const { editor, rejected } = setup(() => allow)
		editor.createShapes([{ id: ids.a, type: 'geo' }])
		const remoteShape = editor.getShape(ids.a)!
		editor.deleteShapes([ids.a])
		editor.sideEffects.registerAfterCreateHandler('shape', (shape) => {
			if (shape.id === ids.a) {
				editor.createShapes([{ id: ids.b, type: 'geo' }])
			}
		})

		allow = false
		editor.store.mergeRemoteChanges(() => {
			editor.store.put([remoteShape])
		})

		expect(editor.getShape(ids.a)).toBeDefined()
		expect(editor.getShape(ids.b)).toBeDefined()
		expect(rejected).toEqual([])
	})

	it('passes the session and the current user', () => {
		const contexts: { sessionId: string; userId: string | null }[] = []
		const { editor } = setup((_diff, { sessionId, userId }) => {
			contexts.push({ sessionId, userId })
		})
		editor.createShapes([{ id: ids.a, type: 'geo' }])
		expect(contexts[0].sessionId).toEqual(expect.any(String))
		expect(contexts[0]).toHaveProperty('userId')
	})
})

describe('capability checks', () => {
	it('allows a capability with no check', () => {
		const editor = new TestEditor()
		expect(editor.checkCapability('create-shape')).toBeNull()
	})

	it('asks the registered checks, and the first rejection wins', () => {
		const editor = new TestEditor()
		const removeA = editor.registerCapabilityCheck('delete-shape', () => true)
		const removeB = editor.registerCapabilityCheck('delete-shape', () => ({ reason: 'b' }))
		editor.registerCapabilityCheck('delete-shape', () => ({ reason: 'c' }))
		expect(editor.checkCapability('delete-shape')).toEqual({ reason: 'b' })
		expect(editor.checkCapability('edit-shape')).toBeNull()

		removeB()
		expect(editor.checkCapability('delete-shape')).toEqual({ reason: 'c' })
		removeA()
	})

	it('rejects every capability in a readonly editor', () => {
		const editor = new TestEditor()
		editor.updateInstanceState({ isReadonly: true })
		expect(editor.checkCapability('create-shape')).toEqual({ reason: 'readonly' })
	})

	it('is reactive', () => {
		const editor = new TestEditor()
		let latest: string | null = null
		const stop = react('capability', () => {
			latest = editor.checkCapability('edit-shape')?.reason ?? null
		})

		const remove = editor.registerCapabilityCheck('edit-shape', () => {
			if (editor.getSelectedShapeIds().length > 1) {
				return { reason: 'one at a time' }
			}
		})
		editor.createShapes([
			{ id: ids.a, type: 'geo' },
			{ id: ids.b, type: 'geo' },
		])
		editor.select(ids.a, ids.b)
		expect(latest).toBe('one at a time')

		remove()
		expect(latest).toBe(null)
		stop()
	})
})
