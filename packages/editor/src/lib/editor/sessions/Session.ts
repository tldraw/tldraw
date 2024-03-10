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
		public options = {} as T
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

	start() {
		this.onStart()
		this.onUpdate()
		this.editor.on('tick', this.handleTick)
		this.editor.on('event', this.handleEditorEvent)
		return this
	}

	update() {
		this.onUpdate()
		return this
	}

	complete() {
		this.onComplete()
		this.dispose()
		return this
	}

	cancel() {
		this.onCancel()
		this.dispose()
		return this
	}

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
