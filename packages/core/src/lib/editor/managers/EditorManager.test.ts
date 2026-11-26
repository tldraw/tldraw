import { vi } from 'vitest'
import type { Editor } from '../Editor'
import { EditorManager } from './EditorManager'

class TestManager extends EditorManager {
	onTestEvent = vi.fn()
	removeTestEvent: () => void

	constructor(editor: Editor) {
		super(editor)
		this.removeTestEvent = this.addEditorEvent('frame', this.onTestEvent)
	}

	detachTestEvent() {
		this.unregister(this.removeTestEvent)
	}

	cancelRaf = vi.fn()
	startRaf() {
		this.register(this.cancelRaf)
	}
	stopRaf() {
		this.unregister(this.cancelRaf)
	}
}

describe('EditorManager', () => {
	let on: ReturnType<typeof vi.fn>
	let off: ReturnType<typeof vi.fn>
	let editor: Editor
	let manager: TestManager

	beforeEach(() => {
		on = vi.fn()
		off = vi.fn()
		editor = { on, off } as unknown as Editor
		manager = new TestManager(editor)
	})

	it('addEditorEvent registers a listener on the editor', () => {
		expect(on).toHaveBeenCalledWith('frame', manager.onTestEvent)
	})

	it('dispose removes registered editor listeners', () => {
		manager.dispose()
		expect(off).toHaveBeenCalledWith('frame', manager.onTestEvent)
	})

	it('register runs custom disposables on dispose', () => {
		manager.startRaf()
		manager.dispose()
		expect(manager.cancelRaf).toHaveBeenCalled()
	})

	it('dispose is safe to call twice', () => {
		manager.dispose()
		expect(() => manager.dispose()).not.toThrow()
	})

	it('unregister runs the disposable now and drops it from dispose', () => {
		manager.startRaf()
		manager.stopRaf()
		expect(manager.cancelRaf).toHaveBeenCalledTimes(1)
		manager.dispose()
		expect(manager.cancelRaf).toHaveBeenCalledTimes(1)
	})

	it('unregister ignores a disposable that already ran', () => {
		manager.startRaf()
		manager.dispose()
		manager.stopRaf()
		expect(manager.cancelRaf).toHaveBeenCalledTimes(1)
	})

	it('addEditorEvent returns the registered unsubscribe so it can be detached early', () => {
		manager.detachTestEvent()
		expect(off).toHaveBeenCalledTimes(1)
		expect(off).toHaveBeenCalledWith('frame', manager.onTestEvent)
		manager.dispose()
		expect(off).toHaveBeenCalledTimes(1)
	})
})
