import { Atom, atom, RecordsDiff, TLRecord } from 'tldraw'
import type { TldrawAgent } from '../TldrawAgent'
import { BaseAgentManager } from './BaseAgentManager'

/**
 * Records the user's shape changes between prompts so the agent can be told
 * about them. Changes made while the agent is acting are ignored.
 */
export class AgentUserActionTracker extends BaseAgentManager {
	private $userActionHistory: Atom<RecordsDiff<TLRecord>[]>
	private stopRecordingFn: (() => void) | null = null

	constructor(agent: TldrawAgent) {
		super(agent)
		this.$userActionHistory = atom('userActionHistory', [])
	}

	/** Clears the history but does not stop recording. */
	reset(): void {
		this.$userActionHistory.set([])
	}

	startRecording() {
		const { editor } = this.agent

		const record = (change: RecordsDiff<TLRecord>, source: 'user' | 'remote') => {
			if (source !== 'user') return
			if (this.agent.getIsActingOnEditor()) return
			this.$userActionHistory.update((prev) => [...prev, change])
		}

		const cleanUpCreate = editor.sideEffects.registerAfterCreateHandler('shape', (shape, source) =>
			record({ added: { [shape.id]: shape }, updated: {}, removed: {} }, source)
		)
		const cleanUpDelete = editor.sideEffects.registerAfterDeleteHandler('shape', (shape, source) =>
			record({ added: {}, updated: {}, removed: { [shape.id]: shape } }, source)
		)
		const cleanUpChange = editor.sideEffects.registerAfterChangeHandler(
			'shape',
			(prev, next, source) =>
				record({ added: {}, updated: { [prev.id]: [prev, next] }, removed: {} }, source)
		)

		const cleanUp = () => {
			cleanUpCreate()
			cleanUpDelete()
			cleanUpChange()
		}
		this.stopRecordingFn = cleanUp
		return cleanUp
	}

	stopRecording() {
		this.stopRecordingFn?.()
		this.stopRecordingFn = null
	}

	clearHistory() {
		this.$userActionHistory.set([])
	}

	getHistory() {
		return this.$userActionHistory.get()
	}

	override dispose() {
		this.stopRecording()
		super.dispose()
	}
}
