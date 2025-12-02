import { FairyPose } from '@tldraw/fairy-shared'
import { uniqueId } from 'tldraw'
import { FairyAgent } from '../FairyAgent'
import { BaseFairyAgentManager } from './BaseFairyAgentManager'

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
export class FairyAgentGestureManager extends BaseFairyAgentManager {
	/**
	 * The stack of active gestures. Each item contains a unique ID and the gesture to display.
	 * The most recently added gesture is displayed first. When a gesture completes, the next
	 * gesture in the stack is displayed. When the stack is empty, the base pose is displayed.
	 */
	private stack: { id: string; gesture: FairyPose }[] = []

	/**
	 * Map of gesture IDs to their timeout IDs for cleanup tracking.
	 */
	private timeoutIds = new Map<string, ReturnType<typeof setTimeout>>()

	/**
	 * Creates a new gesture manager for the given fairy agent.
	 */
	constructor(public agent: FairyAgent) {
		super(agent)
		// Register cleanup function to clear all timeouts on dispose
		this.disposables.add(() => {
			this.clearAllTimeouts()
		})
	}

	/**
	 * Clears all active timeouts.
	 */
	private clearAllTimeouts(): void {
		for (const timeoutId of this.timeoutIds.values()) {
			clearTimeout(timeoutId)
		}
		this.timeoutIds.clear()
	}

	/**
	 * Resets the gesture manager by clearing the gesture stack and removing any active gesture
	 * from the fairy entity.
	 * @returns void
	 */
	reset(): void {
		this.clearAllTimeouts()
		this.stack = []
		const agent = this.agent
		agent.updateEntity((fairy) => ({ ...fairy, gesture: null }))
	}

	/**
	 * Removes the most recently added gesture from the stack and updates the fairy entity
	 * to display the next gesture in the stack, or null if the stack is empty.
	 * @returns void
	 */
	pop() {
		const popped = this.stack.pop()
		if (popped) {
			// Clear timeout if this gesture had one
			const timeoutId = this.timeoutIds.get(popped.id)
			if (timeoutId) {
				clearTimeout(timeoutId)
				this.timeoutIds.delete(popped.id)
			}
		}
		const finalGesture = this.stack[this.stack.length - 1]?.gesture ?? null
		this.agent.updateEntity((fairy) => ({ ...fairy, gesture: finalGesture }))
	}

	/**
	 * Adds a gesture to the stack and immediately displays it. When this gesture completes,
	 * the next gesture in the stack will be displayed.
	 *
	 * @param gesture - The gesture pose to add to the stack.
	 * @param duration - Optional duration in milliseconds. If provided, the gesture will
	 * automatically be removed from the stack after this duration.
	 * @returns void
	 */
	push(gesture: FairyPose, duration?: number) {
		const { agent } = this
		agent.updateEntity((fairy) => ({ ...fairy, gesture: gesture }))

		const id = uniqueId()
		this.stack.push({ id, gesture })
		if (duration) {
			const timeoutId = setTimeout(() => {
				this.pop()
			}, duration)
			this.timeoutIds.set(id, timeoutId)
		}
	}

	/**
	 * Clears all gestures from the stack and removes any active gesture from the fairy entity.
	 * This will cause the fairy to revert to its base pose.
	 * @returns void
	 */
	clear() {
		this.clearAllTimeouts()
		const { agent } = this
		this.stack = []
		agent.updateEntity((fairy) => ({ ...fairy, gesture: null }))
	}
}
