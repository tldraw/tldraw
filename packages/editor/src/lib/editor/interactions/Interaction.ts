import { Editor } from '../Editor'
import { TLEventInfo } from '../types/event-types'

/**
 * A simple event object that can be used to prevent the default behavior of an interaction event.
 * @public */
export class InteractionEvent<T extends object = object> {
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
 *  An interaction info object that can be used to define event handlers for an interaction.
 *  @public */
export interface InteractionEventHandlers<T extends object = object> {
	onBeforeStart?: (event: InteractionEvent<T>) => void
	onStart?: (event: InteractionEvent<T>) => void
	onBeforeUpdate?: (event: InteractionEvent<T>) => void
	onUpdate?: (event: InteractionEvent<T>) => void
	onBeforeInterrupt?: (event: InteractionEvent<T>) => void
	onInterrupt?: (event: InteractionEvent<T>) => void
	onBeforeComplete?: (event: InteractionEvent<T>) => void
	onComplete?: (event: InteractionEvent<T>) => void
	onBeforeCancel?: (event: InteractionEvent<T>) => void
	onCancel?: (event: InteractionEvent<T>) => void
	onBeforeEnd?: (event: InteractionEvent<T>) => void
	onEnd?: (event: InteractionEvent<T>) => void
}

/**
 * An interaction info object that can be used to define event handlers for an interaction and provide other configuration info to an interaction.
 * @public */
export type InteractionInfo<T extends object = object> = InteractionEventHandlers & T

/**
 * An interaction is an interaction or other event that occurs over time,
 * such as resizing, drawing, or transforming shapes.
 *
 * @public
 */
export abstract class Interaction<T extends object = object> {
	private infoWithoutEventHandlers: T
	protected elapsed = 0
	protected duration = 0

	constructor(
		public editor: Editor,
		public info = {} as InteractionInfo<T>
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

	isDisposed = false

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

	private getinteractionEvent() {
		return new InteractionEvent(this.infoWithoutEventHandlers, this.duration, this.elapsed)
	}

	/**
	 * Start the interaction. Sets up event listeners and calls `onStart` and `onUpdate`.
	 * @public
	 */
	start() {
		const event = this.getinteractionEvent()
		this.info.onBeforeStart?.(event)
		if (!event.isDefaultPrevented) {
			this.onStart?.()
			this.info.onStart?.(event)
		}
		// Start may have completed or cancelled
		if (!this.isDisposed) {
			this.onUpdate?.()
			this.editor.on('tick', this.handleTick)
			this.editor.on('event', this.handleEditorEvent)
		}
		return this
	}

	/**
	 * Update the interaction. Calls `onUpdate`. This is called automatically on every tick and on editor `keyboard` events.
	 * @public
	 */
	update() {
		const event = this.getinteractionEvent()
		this.info.onBeforeUpdate?.(event)
		if (!event.isDefaultPrevented) {
			this.onUpdate?.()
			this.info.onUpdate?.(event)
		}
		return this
	}

	/**
	 * Complete the interaction. This is called automatically on editor's `complete` events. Calls `onComplete` and disposes of the interaction.
	 * @public
	 */
	complete() {
		const event = this.getinteractionEvent()
		this.info.onBeforeComplete?.(event)
		if (!event.isDefaultPrevented) {
			this.onComplete?.()
			this.info.onComplete?.(event)
		}
		this.end()
		return this
	}

	/**
	 * Cancel the interaction. This is called automatically on editor's `cancel` events. Calls `onCancel` and disposes of the interaction.
	 * @public
	 */
	cancel() {
		const event = this.getinteractionEvent()
		this.info.onBeforeCancel?.(event)
		if (!event.isDefaultPrevented) {
			this.onCancel?.()
			this.info.onCancel?.(event)
		}
		this.end()
		return this
	}

	/**
	 * End the interaction. Called automatically by complete or cancel.
	 */
	private end() {
		const event = this.getinteractionEvent()
		this.info.onBeforeEnd?.(event)
		if (!event.isDefaultPrevented) {
			this.onEnd?.()
			this.info.onEnd?.(event)
			this.dispose()
		}
		return this
	}

	/**
	 * Interrupt the interaction. This is called automatically on editor's `interrupt` events. Calls `onInterrupt`. It does not dispose the interaction.
	 * @public
	 */
	interrupt() {
		const event = this.getinteractionEvent()
		this.info.onBeforeInterrupt?.(event)
		if (!event.isDefaultPrevented) {
			this.onInterrupt?.()
			this.info.onInterrupt?.(event)
		}
		return this
	}

	/**
	 * Dispose of the interaction. Removes event listeners.
	 *
	 * @public
	 */
	dispose = () => {
		this.editor.off('tick', this.handleTick)
		this.editor.off('event', this.handleEditorEvent)
		this.isDisposed = true
	}

	protected onStart?(): void

	protected onUpdate?(): void

	protected onComplete?(): void

	protected onCancel?(): void

	protected onInterrupt?(): void

	protected onEnd?(): void
}
