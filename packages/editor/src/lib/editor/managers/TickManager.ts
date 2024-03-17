import { globalTick } from '@tldraw/utils'
import { uniqueId } from '../../utils/uniqueId'
import { Editor } from '../Editor'

export class TickManager {
	constructor(public editor: Editor) {
		this.editor.disposables.add(this.dispose)
		this.start()
	}

	start = () => {
		globalTick.addListener(this.tick)
	}

	// Clear the listener
	dispose = () => {
		globalTick.removeListener(this.tick)
	}

	tick = (elapsed: number) => {
		this.editor.emit('tick', elapsed)
		this.editor.updatePointerVelocity(elapsed)
		this.updateTimeouts(elapsed)
	}

	timeouts = new Map<string, { remaining: number; cb: () => void }>()

	setTimeout = (cb: () => void, duration: number) => {
		const id = uniqueId()
		this.timeouts.set(id, { remaining: duration, cb })
		return () => this.clearTimeout(id)
	}

	clearTimeout = (id: string) => {
		this.timeouts.delete(id)
	}

	updateTimeouts = (elapsed: number) => {
		for (const [id, timeout] of this.timeouts) {
			timeout.remaining -= elapsed
			if (timeout.remaining < 0) {
				timeout.cb()
				this.timeouts.delete(id)
			}
		}
	}
}
