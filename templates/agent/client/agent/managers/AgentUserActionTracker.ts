import { Atom, atom, RecordsDiff, TLRecord } from 'tldraw'
import type { TldrawAgent } from '../TldrawAgent'
import { BaseAgentManager } from './BaseAgentManager'

/**
 * Tracks user actions on the canvas for an agent.
 * This allows the agent to be aware of changes the user makes between prompts.
 */
export class AgentUserActionTracker extends BaseAgentManager {
	/**
	 * An atom that stores document changes made by the user since the previous request.
	 */
	private $userActionHistory: Atom<RecordsDiff<TLRecord>[]>

	/**
	 * A function that stops recording user actions.
	 */
	private stopRecordingFn: (() => void) | null = null

	/**
	 * Creates a new user action tracker for the given agent.
	 * Initializes with an empty action history.
	 */
	constructor(agent: TldrawAgent) {
		super(agent)
		this.$userActionHistory = atom('userActionHistory', [])
	}

	/**
	 * Reset the user action tracker to its initial state.
	 * Clears the action history but does not stop recording.
	 */
	reset(): void {
		this.$userActionHistory.set([])
	}

	/**
	 * Start recording user actions.
	 * Sets up listeners for create, delete, and change events.
	 * @returns A cleanup function to stop recording user actions.
	 */
	startRecording() {
		const { editor } = this.agent
		const cleanUpCreate = editor.sideEffects.registerAfterCreateHandler(
			'shape',
			(shape, source) => {
				if (source !== 'user') return
				if (this.agent.getIsActingOnEditor()) return
				const change = {
					added: { [shape.id]: shape },
					updated: {},
					removed: {},
				}
				this.$userActionHistory.update((prev) => [...prev, change])
				return
			}
		)

		const cleanUpDelete = editor.sideEffects.registerAfterDeleteHandler(
			'shape',
			(shape, source) => {
				if (source !== 'user') return
				if (this.agent.getIsActingOnEditor()) return
				const change = {
					added: {},
					updated: {},
					removed: { [shape.id]: shape },
				}
				this.$userActionHistory.update((prev) => [...prev, change])
				return
			}
		)

		const cleanUpChange = editor.sideEffects.registerAfterChangeHandler(
			'shape',
			(prev, next, source) => {
				if (source !== 'user') return
				if (this.agent.getIsActingOnEditor()) return
				const change: RecordsDiff<TLRecord> = {
					added: {},
					updated: { [prev.id]: [prev, next] },
					removed: {},
				}
				this.$userActionHistory.update((prev) => [...prev, change])
				return
			}
		)

		const cleanUp = () => {
			cleanUpCreate()
			cleanUpDelete()
			cleanUpChange()
		}

		this.stopRecordingFn = cleanUp
		return cleanUp
	}

	/**
	 * Stop recording user actions.
	 * Cleans up event listeners but preserves the action history.
	 */
	stopRecording() {
		this.stopRecordingFn?.()
		this.stopRecordingFn = null
	}

	/**
	 * Clear the user action history.
	 * Does not affect recording status.
	 */
	clearHistory() {
		this.$userActionHistory.set([])
	}

	/**
	 * Get the current user action history.
	 * @returns An array of record diffs representing user changes.
	 */
	getHistory() {
		return this.$userActionHistory.get()
	}

	/**
	 * Dispose of the tracker by stopping recording.
	 * Called automatically during manager cleanup.
	 */
	override dispose() {
		this.stopRecording()
		super.dispose()
	}
}
