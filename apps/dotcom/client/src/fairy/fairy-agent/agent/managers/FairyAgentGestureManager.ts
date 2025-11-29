import { FairyPose } from '@tldraw/fairy-shared'
import { uniqueId } from 'tldraw'
import { FairyAgent } from '../FairyAgent'

/**
 * Manages the stack of gestures for a fairy agent. A gesture, if present, takes precedence over the base pose.
 * When a gesture is added, it is displayed and the next gesture in the stack is displayed.
 * When a gesture completes, the next gesture in the stack is displayed.
 * When the stack is empty, the base pose is displayed.
 *
 * Each item contains a unique ID and the gesture to display.
 * The most recently added gesture is the one that is displayed.
 * This array determines what to do when one gesture completes.
 * eg: Switch to the next gesture in the stack.
 * eg: Revert to the base pose.
 */
export class FairyAgentGestureManager {
	stack: { id: string; gesture: FairyPose }[] = []

	constructor(public agent: FairyAgent) {}

	pop() {
		const { agent } = this
		this.stack.pop()
		const finalGesture = this.stack[this.stack.length - 1]?.gesture ?? null
		agent.$fairyEntity.update((fairy) => ({ ...fairy, gesture: finalGesture }))
	}

	/**
	 * Add a gesture to the stack. When this gesture completes, the next gesture in the stack is displayed.
	 */
	push(gesture: FairyPose, duration?: number) {
		const { agent } = this
		agent.$fairyEntity.update((fairy) => ({ ...fairy, gesture: gesture }))

		const id = uniqueId()
		this.stack.push({ id, gesture })
		if (duration) {
			setTimeout(() => {
				this.pop()
			}, duration)
		}
	}

	/**
	 * Clear the fairy's gesture.
	 */
	clear() {
		const { agent } = this
		this.stack = []
		agent.$fairyEntity.update((fairy) => ({ ...fairy, gesture: null }))
	}
}
