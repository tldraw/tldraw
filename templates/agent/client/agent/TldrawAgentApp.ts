import { Editor } from 'tldraw'
import { AgentAppAgentsManager } from './managers/AgentAppAgentsManager'
import { AgentAppPersistenceManager } from './managers/AgentAppPersistenceManager'

/**
 * App-level coordinator for a given editor: agent lifecycle and persistence.
 * Individual agents (TldrawAgent) handle their own chat, context, and requests.
 *
 * @example
 * ```tsx
 * const app = new TldrawAgentApp(editor, { onError: handleError })
 * const agent = app.agents.getAgent()
 * agent.prompt('Draw a cat')
 * ```
 */
export class TldrawAgentApp {
	agents: AgentAppAgentsManager
	persistence: AgentAppPersistenceManager

	private handleEditorGone = () => this.dispose()

	private _editor: Editor | null

	/** @throws if the app has been disposed. */
	get editor(): Editor {
		if (!this._editor) {
			throw new Error('TldrawAgentApp has been disposed')
		}
		return this._editor
	}

	constructor(
		editor: Editor,
		public options: {
			onError: (e: any) => void
		}
	) {
		this._editor = editor
		this.agents = new AgentAppAgentsManager(this)
		this.persistence = new AgentAppPersistenceManager(this)
		editor.on('crash', this.handleEditorGone)
		editor.on('dispose', this.handleEditorGone)
	}

	dispose() {
		if (!this._editor) return
		this._editor.off('crash', this.handleEditorGone)
		this._editor.off('dispose', this.handleEditorGone)
		this.persistence.dispose()
		this.agents.dispose()
		this._editor = null
	}

	reset() {
		this.agents.reset()
		this.persistence.reset()
	}
}
