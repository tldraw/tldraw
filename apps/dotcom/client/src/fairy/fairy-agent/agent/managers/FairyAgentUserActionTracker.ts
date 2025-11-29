import { atom, Atom, RecordsDiff, TLRecord } from 'tldraw'
import { $fairyIsApplyingAction } from '../../../fairy-globals'
import { FairyAgent } from '../FairyAgent'

/**
 * Tracks user actions on the canvas for a fairy agent.
 * This allows the agent to be aware of changes the user makes between prompts.
 */
export class FairyAgentUserActionTracker {
	/**
	 * An atom that stores document changes made by the user since the previous request.
	 */
	$userActionHistory: Atom<RecordsDiff<TLRecord>[]>

	/**
	 * A function that stops recording user actions.
	 */
	private stopRecordingFn: (() => void) | null = null

	constructor(public agent: FairyAgent) {
		this.$userActionHistory = atom('userActionHistory', [])
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
				if (this.agent['isActing']) return
				if ($fairyIsApplyingAction.get()) return
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
				if (this.agent['isActing']) return
				if ($fairyIsApplyingAction.get()) return
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
				if (this.agent['isActing']) return
				if ($fairyIsApplyingAction.get()) return
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
	 */
	stopRecording() {
		this.stopRecordingFn?.()
		this.stopRecordingFn = null
	}

	/**
	 * Clear the user action history.
	 */
	clearUserActionHistory() {
		this.$userActionHistory.set([])
	}

	/**
	 * Get the current user action history.
	 */
	getUserActionHistory() {
		return this.$userActionHistory.get()
	}

	/**
	 * Dispose of the tracker by stopping recording.
	 */
	dispose() {
		this.stopRecording()
	}
}
