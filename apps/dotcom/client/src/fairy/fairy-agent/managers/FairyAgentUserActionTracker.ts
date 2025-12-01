import { atom, Atom, RecordsDiff, TLRecord } from 'tldraw'
import { FairyAgent } from '../FairyAgent'
import { BaseFairyAgentManager } from './BaseFairyAgentManager'

/**
 * Tracks user actions on the canvas for a fairy agent.
 * This allows the agent to be aware of changes the user makes between prompts.
 */
export class FairyAgentUserActionTracker extends BaseFairyAgentManager {
	/**
	 * An atom that stores document changes made by the user since the previous request.
	 * @private
	 */
	private $userActionHistory: Atom<RecordsDiff<TLRecord>[]>

	/**
	 * A function that stops recording user actions.
	 * @private
	 */
	private stopRecordingFn: (() => void) | null = null

	/**
	 * Creates a new user action tracker for the given fairy agent.
	 * Initializes with an empty action history.
	 */
	constructor(public agent: FairyAgent) {
		super(agent)
		this.$userActionHistory = atom('userActionHistory', [])
	}

	/**
	 * Reset the user action tracker to its initial state.
	 * Stops recording and clears the action history.
	 */
	reset(): void {
		this.stopRecording()
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
				if (this.agent.fairyApp.getIsApplyingAction()) return
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
				if (this.agent.fairyApp.getIsApplyingAction()) return
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
				if (this.agent.fairyApp.getIsApplyingAction()) return
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
	dispose() {
		this.stopRecording()
	}
}
