import { Editor } from '../Editor'
import { TLEventInfo } from '../types/event-types'

/**
 * A session is an interaction or other event that occurs over time,
 * such as resizing, drawing, or transforming shapes.
 *
 * @public
 */
export abstract class Session<T extends object = object> {
	constructor(
		public editor: Editor,
		public info = {} as T
	) {}

	dispose = () => {
		this.editor.off('tick', this.handleTick)
		this.editor.off('event', this.handleEditorEvent)
	}

	private handleTick = () => {
		this.update()
	}

	private handleEditorEvent = (event: TLEventInfo) => {
		switch (event.type) {
			case 'keyboard': {
				this.update()
				break
			}
			case 'misc': {
				switch (event.name) {
					case 'cancel': {
						this.cancel()
						this.dispose()
						break
					}
					case 'complete': {
						this.complete()
						this.dispose()
						break
					}
					case 'interrupt': {
						this.interrupt()
						break
					}
				}
				break
			}
		}
	}

	abstract readonly id: string

	/**
	 * Start the session. Sets up event listeners and calls `onStart` and `onUpdate`.
	 * @public
	 */
	start() {
		this.onStart()
		this.onUpdate()
		this.editor.on('tick', this.handleTick)
		this.editor.on('event', this.handleEditorEvent)
		return this
	}

	/**
	 * Update the session. Calls `onUpdate`. This is called automatically on every tick and on editor `keyboard` events.
	 * @public
	 */
	update() {
		this.onUpdate()
		return this
	}

	/**
	 * Complete the session. This is called automatically on editor's `complete` events. Calls `onComplete` and disposes of the session.
	 * @public
	 */
	complete() {
		this.onComplete()
		this.dispose()
		return this
	}

	/**
	 * Cancel the session. This is called automatically on editor's `cancel` events. Calls `onCancel` and disposes of the session.
	 * @public
	 */
	cancel() {
		this.onCancel()
		this.dispose()
		return this
	}

	/**
	 * Interrupt the session. This is called automatically on editor's `interrupt` events. Calls `onInterrupt`. It does not dispose the session.
	 * @public
	 */
	interrupt() {
		this.onInterrupt()
		return this
	}

	protected abstract onStart(): void

	protected abstract onUpdate(): void

	protected abstract onComplete(): void

	protected abstract onCancel(): void

	protected abstract onInterrupt(): void
}
