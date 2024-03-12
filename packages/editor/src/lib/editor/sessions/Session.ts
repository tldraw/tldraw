import { Editor } from '../Editor'
import { TLEventInfo } from '../types/event-types'

/**
 * A simple event object that can be used to prevent the default behavior of a session event.
 * @public */
export class SessionEvent<T extends object = object> {
	constructor(
		public info: T,
		public duration: number,
		public elapsed: number
	) {}
	isDefaultPrevented = false
	preventDefault() {
		this.isDefaultPrevented = true
	}
}

/**
 *  A session info object that can be used to define event handlers for a session.
 *  @public */
export interface SessionEventHandlers<T extends object = object> {
	onBeforeStart?: (event: SessionEvent<T>) => void
	onStart?: (event: SessionEvent<T>) => void
	onBeforeUpdate?: (event: SessionEvent<T>) => void
	onUpdate?: (event: SessionEvent<T>) => void
	onBeforeInterrupt?: (event: SessionEvent<T>) => void
	onInterrupt?: (event: SessionEvent<T>) => void
	onBeforeComplete?: (event: SessionEvent<T>) => void
	onComplete?: (event: SessionEvent<T>) => void
	onBeforeCancel?: (event: SessionEvent<T>) => void
	onCancel?: (event: SessionEvent<T>) => void
	onBeforeEnd?: (event: SessionEvent<T>) => void
	onEnd?: (event: SessionEvent<T>) => void
}

/**
 * A session info object that can be used to define event handlers for a session and provide other configuration info to a session.
 * @public */
export type SessionInfo<T extends object = object> = SessionEventHandlers & T

/**
 * A session is an interaction or other event that occurs over time,
 * such as resizing, drawing, or transforming shapes.
 *
 * @public
 */
export abstract class Session<T extends object = object> {
	private infoWithoutEventHandlers: T
	protected elapsed = 0
	protected duration = 0

	constructor(
		public editor: Editor,
		public info = {} as SessionInfo<T>
	) {
		const infoWithoutDefaults = { ...info }
		delete infoWithoutDefaults.onBeforeStart
		delete infoWithoutDefaults.onStart
		delete infoWithoutDefaults.onBeforeUpdate
		delete infoWithoutDefaults.onUpdate
		delete infoWithoutDefaults.onBeforeInterrupt
		delete infoWithoutDefaults.onInterrupt
		delete infoWithoutDefaults.onBeforeComplete
		delete infoWithoutDefaults.onComplete
		delete infoWithoutDefaults.onBeforeCancel
		delete infoWithoutDefaults.onCancel
		delete infoWithoutDefaults.onBeforeEnd
		delete infoWithoutDefaults.onEnd
		this.infoWithoutEventHandlers = infoWithoutDefaults
	}

	protected handleTick = (elapsed: number) => {
		this.elapsed = elapsed
		this.duration += elapsed
		this.update()
	}

	protected handleEditorEvent = (event: TLEventInfo) => {
		switch (event.type) {
			case 'keyboard': {
				if (event.name === 'key_repeat') return
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

	private getSessionEvent() {
		return new SessionEvent(this.infoWithoutEventHandlers, this.duration, this.elapsed)
	}

	/**
	 * Start the session. Sets up event listeners and calls `onStart` and `onUpdate`.
	 * @public
	 */
	start() {
		const event = this.getSessionEvent()
		this.info.onBeforeStart?.(event)
		if (!event.isDefaultPrevented) {
			this.onStart?.()
			this.info.onStart?.(event)
		}
		this.onUpdate?.()
		this.editor.on('tick', this.handleTick)
		this.editor.on('event', this.handleEditorEvent)
		return this
	}

	/**
	 * Update the session. Calls `onUpdate`. This is called automatically on every tick and on editor `keyboard` events.
	 * @public
	 */
	update() {
		const event = this.getSessionEvent()
		this.info.onBeforeUpdate?.(event)
		if (!event.isDefaultPrevented) {
			this.onUpdate?.()
			this.info.onUpdate?.(event)
		}
		return this
	}

	/**
	 * Complete the session. This is called automatically on editor's `complete` events. Calls `onComplete` and disposes of the session.
	 * @public
	 */
	complete() {
		const event = this.getSessionEvent()
		this.info.onBeforeComplete?.(event)
		if (!event.isDefaultPrevented) {
			this.onComplete?.()
			this.info.onComplete?.(event)
		}
		this.end()
		return this
	}

	/**
	 * Cancel the session. This is called automatically on editor's `cancel` events. Calls `onCancel` and disposes of the session.
	 * @public
	 */
	cancel() {
		const event = this.getSessionEvent()
		this.info.onBeforeCancel?.(event)
		if (!event.isDefaultPrevented) {
			this.onCancel?.()
			this.info.onCancel?.(event)
		}
		this.end()
		return this
	}

	/**
	 * End the session. Called automatically by complete or cancel.
	 */
	private end() {
		const event = this.getSessionEvent()
		this.info.onBeforeEnd?.(event)
		if (!event.isDefaultPrevented) {
			this.onEnd?.()
			this.info.onEnd?.(event)
			this.dispose()
		}
		return this
	}

	/**
	 * Interrupt the session. This is called automatically on editor's `interrupt` events. Calls `onInterrupt`. It does not dispose the session.
	 * @public
	 */
	interrupt() {
		const event = this.getSessionEvent()
		this.info.onBeforeInterrupt?.(event)
		if (!event.isDefaultPrevented) {
			this.onInterrupt?.()
			this.info.onInterrupt?.(event)
		}
		return this
	}

	/**
	 * Dispose of the session. Removes event listeners.
	 *
	 * @public
	 */
	dispose = () => {
		this.editor.off('tick', this.handleTick)
		this.editor.off('event', this.handleEditorEvent)
	}

	protected onStart?(): void

	protected onUpdate?(): void

	protected onComplete?(): void

	protected onCancel?(): void

	protected onInterrupt?(): void

	protected onEnd?(): void
}
