import { InstancePresenceRecordType, TLPOINTER_ID, createUserId } from '@tldraw/tlschema'
import { vi } from 'vitest'
import { createTLStore } from '../../../config/createTLStore'
import { TldrawOptions } from '../../../options'
import { Editor } from '../../Editor'
import { StateNode } from '../../tools/StateNode'

function createPresence(editor: Editor) {
	return InstancePresenceRecordType.create({
		id: InstancePresenceRecordType.createId('peer'),
		userId: createUserId('peer'),
		userName: 'Peer',
		currentPageId: editor.getCurrentPageId(),
	})
}

function createTestEditor(options?: Partial<TldrawOptions>) {
	const store = createTLStore({})
	store.ensureStoreIsUsable()
	// Attached to the document so that events dispatched on the container
	// propagate to the window, where the activity listeners live.
	const container = document.createElement('div')
	document.body.appendChild(container)
	const editor = new Editor({
		store,
		bindingUtils: [],
		shapeUtils: [],
		getContainer: () => container,
		tools: [],
		options,
	})
	editor.disposables.add(() => container.remove())
	// Input listeners only attach once the editor is mounted, which is normally
	// emitted by `TldrawEditor` when the container is in the DOM.
	editor.emit('mount')
	return editor
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

		it('stamps on keyboard input in the container', () => {
			editor.store.put([createPresence(editor)])

			editor.getContainer().dispatchEvent(new KeyboardEvent('keydown', { key: 'a', code: 'KeyA' }))

			expect(editor.store.get(TLPOINTER_ID)!.lastActivityTimestamp).toBe(Date.now())
		})

		it('stamps on pointer input in the container', () => {
			editor.store.put([createPresence(editor)])

			editor.getContainer().dispatchEvent(new Event('pointermove', { bubbles: true }))

			expect(editor.store.get(TLPOINTER_ID)!.lastActivityTimestamp).toBe(Date.now())
		})

		it('stamps on text input that fires no keydown, e.g. IME and gesture typing', () => {
			editor.store.put([createPresence(editor)])

			editor.getContainer().dispatchEvent(new Event('beforeinput', { bubbles: true }))

			expect(editor.store.get(TLPOINTER_ID)!.lastActivityTimestamp).toBe(Date.now())
		})

		it('stamps on input elsewhere in the tab, outside the container', () => {
			editor.store.put([createPresence(editor)])

			document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', code: 'KeyA' }))

			expect(editor.store.get(TLPOINTER_ID)!.lastActivityTimestamp).toBe(Date.now())
		})

		it('keeps a minimum throttle window when the idle timeout is tiny', () => {
			const tinyEditor = createTestEditor({ collaboratorIdleTimeoutMs: 0 })
			try {
				tinyEditor.store.put([createPresence(tinyEditor)])

				tinyEditor.inputs.markActivity()
				const stamp = tinyEditor.store.get(TLPOINTER_ID)!.lastActivityTimestamp

				vi.advanceTimersByTime(50)
				tinyEditor.inputs.markActivity()
				expect(tinyEditor.store.get(TLPOINTER_ID)!.lastActivityTimestamp).toBe(stamp)
			} finally {
				tinyEditor.dispose()
			}
		})

		it('attaches input listeners only while sharing with someone', () => {
			const addEventListener = vi.spyOn(window, 'addEventListener')
			const removeEventListener = vi.spyOn(window, 'removeEventListener')
			const soloEditor = createTestEditor()
			try {
				expect(addEventListener).not.toHaveBeenCalled()

				soloEditor.store.put([createPresence(soloEditor)])
				expect(addEventListener).toHaveBeenCalledWith('pointermove', expect.anything(), {
					capture: true,
				})

				soloEditor.store.remove([createPresence(soloEditor).id])
				expect(removeEventListener).toHaveBeenCalledWith('pointermove', expect.anything(), {
					capture: true,
				})
			} finally {
				soloEditor.dispose()
				addEventListener.mockRestore()
				removeEventListener.mockRestore()
			}
		})

		it('attaches no input listeners when construction fails before mount', () => {
			class DuplicateTool extends StateNode {
				static override id = 'duplicate-tool'
			}

			const addEventListener = vi.spyOn(window, 'addEventListener')
			try {
				const store = createTLStore({})
				store.ensureStoreIsUsable()
				expect(
					() =>
						new Editor({
							store,
							bindingUtils: [],
							shapeUtils: [],
							getContainer: () => document.createElement('div'),
							// The duplicate id makes the constructor throw after the inputs
							// manager is built, so the editor is never disposed.
							tools: [DuplicateTool, DuplicateTool],
						})
				).toThrow()

				expect(addEventListener).not.toHaveBeenCalled()
			} finally {
				addEventListener.mockRestore()
			}
		})

		it('does not stamp on pointer moves with no DOM input, e.g. following a user', () => {
			editor.store.put([createPresence(editor)])

			editor.inputs.markActivity()
			const stamp = editor.store.get(TLPOINTER_ID)!.lastActivityTimestamp

			vi.advanceTimersByTime(5000)
			editor.inputs.updateFromEvent({
				type: 'pointer',
				name: 'pointer_move',
				point: { x: 100, y: 50 },
				pointerId: 1,
				button: 0,
				isPen: false,
				target: 'canvas',
				shiftKey: false,
				altKey: false,
				ctrlKey: false,
				metaKey: false,
				accelKey: false,
			})

			// The pointer position updates, but the activity clock doesn't.
			expect(editor.store.get(TLPOINTER_ID)!).toMatchObject({
				x: 100,
				y: 50,
				lastActivityTimestamp: stamp,
			})
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
