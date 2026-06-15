import { vi } from 'vitest'
import type { Editor } from '../Editor'
import { EditorManager } from './EditorManager'

class TestManager extends EditorManager {
	onTestEvent = vi.fn()

	constructor(editor: Editor) {
		super(editor)
		this.addEditorEvent('frame', this.onTestEvent)
	}

	cancelRaf = vi.fn()
	startRaf() {
		this._register(this.cancelRaf)
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

	it('_register runs custom disposables on dispose', () => {
		manager.startRaf()
		manager.dispose()
		expect(manager.cancelRaf).toHaveBeenCalled()
	})

	it('dispose is safe to call twice', () => {
		manager.dispose()
		expect(() => manager.dispose()).not.toThrow()
	})
})
