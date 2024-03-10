import { Editor } from '../Editor'
import { TLEventInfo } from '../types/event-types'

/**
 * A session is an interaction or other event that occurs over time,
 * such as resizing, drawing, or transforming shapes.
 *
 * @public
 */
export abstract class Session {
	constructor(public editor: Editor) {
		this.editor.on('tick', this.handleTick)
		this.editor.on('event', this.handleEditorEvent)
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

	dispose = () => {
		this.editor.off('tick', this.handleTick)
		this.editor.off('event', this.handleEditorEvent)
	}

	abstract readonly id: string

	abstract start(): void

	abstract update(): void

	abstract complete(): void

	abstract cancel(): void

	abstract interrupt(): void
}
