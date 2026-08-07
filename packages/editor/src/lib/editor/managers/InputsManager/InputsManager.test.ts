import { InstancePresenceRecordType, TLPOINTER_ID, createUserId } from '@tldraw/tlschema'
import { vi } from 'vitest'
import { createTLStore } from '../../../config/createTLStore'
import { Editor } from '../../Editor'

function createPresence(editor: Editor) {
	return InstancePresenceRecordType.create({
		id: InstancePresenceRecordType.createId('peer'),
		userId: createUserId('peer'),
		userName: 'Peer',
		currentPageId: editor.getCurrentPageId(),
	})
}

function createTestEditor() {
	const store = createTLStore({})
	store.ensureStoreIsUsable()
	return new Editor({
		store,
		bindingUtils: [],
		shapeUtils: [],
		getContainer: () => document.createElement('div'),
		tools: [],
	})
}

describe('InputsManager', () => {
	let editor: Editor

	beforeEach(() => {
		editor = createTestEditor()
	})

	afterEach(() => {
		editor.dispose()
	})

	it('updates pointer velocity on frame events', () => {
		const point = editor.inputs.getCurrentScreenPoint()
		point.x = 0
		point.y = 0
		editor.emit('frame', 16)

		point.x = 100
		point.y = 0
		editor.emit('frame', 16)

		expect(editor.inputs.getPointerVelocity().len()).toBeGreaterThan(0)
	})

	describe('markActivity', () => {
		beforeEach(() => {
			vi.useFakeTimers()
		})

		afterEach(() => {
			vi.useRealTimers()
		})

		it('does nothing when there are no collaborators', () => {
			editor.inputs.markActivity()

			expect(editor.store.get(TLPOINTER_ID)!.lastActivityTimestamp).toBe(0)
		})

		it('stamps the pointer record, preserving its position', () => {
			editor.store.put([createPresence(editor)])
			editor.store.put([{ ...editor.store.get(TLPOINTER_ID)!, x: 5, y: 6 }])

			editor.inputs.markActivity()

			expect(editor.store.get(TLPOINTER_ID)!).toMatchObject({
				x: 5,
				y: 6,
				lastActivityTimestamp: Date.now(),
			})
		})

		it('throttles stamps on the leading edge', () => {
			editor.store.put([createPresence(editor)])

			editor.inputs.markActivity()
			const firstStamp = editor.store.get(TLPOINTER_ID)!.lastActivityTimestamp

			vi.advanceTimersByTime(500)
			editor.inputs.markActivity()
			expect(editor.store.get(TLPOINTER_ID)!.lastActivityTimestamp).toBe(firstStamp)

			vi.advanceTimersByTime(600)
			editor.inputs.markActivity()
			expect(editor.store.get(TLPOINTER_ID)!.lastActivityTimestamp).toBe(firstStamp + 1100)
		})

		it('stamps on keyboard events dispatched through the editor', () => {
			editor.store.put([createPresence(editor)])

			editor.dispatch({
				type: 'keyboard',
				name: 'key_down',
				key: 'a',
				code: 'KeyA',
				shiftKey: false,
				altKey: false,
				ctrlKey: false,
				metaKey: false,
				accelKey: false,
			})

			expect(editor.store.get(TLPOINTER_ID)!.lastActivityTimestamp).toBe(Date.now())
		})
	})

	it('stops updating pointer velocity after dispose', () => {
		const point = editor.inputs.getCurrentScreenPoint()
		point.x = 0
		point.y = 0
		editor.emit('frame', 16)

		point.x = 100
		point.y = 0
		editor.emit('frame', 16)

		const velocityBeforeDispose = editor.inputs.getPointerVelocity().clone()
		expect(velocityBeforeDispose.len()).toBeGreaterThan(0)

		editor.inputs.dispose()

		point.x = 200
		point.y = 0
		editor.emit('frame', 16)

		expect(editor.inputs.getPointerVelocity()).toEqual(velocityBeforeDispose)
	})
})
