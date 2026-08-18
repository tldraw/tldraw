import { Editor, EditorAtom, uniqueId } from 'tldraw'
import { TldrawAgent } from '../TldrawAgent'
import { BaseAgentAppManager } from './BaseAgentAppManager'

/**
 * Agent lifecycle: creation, disposal, and tracking.
 *
 * Agents live in an EditorAtom so tools and overlays that only have the editor
 * can reach them via the static `getAgents(editor)` / `getAgent(editor, id)`.
 */
export class AgentAppAgentsManager extends BaseAgentAppManager {
	private static $agents = new EditorAtom<TldrawAgent[]>('agents', () => [])

	static getAgents(editor: Editor): TldrawAgent[] {
		return AgentAppAgentsManager.$agents.get(editor)
	}

	/** Get an agent by id, or the first agent if no id is given. */
	static getAgent(editor: Editor, id?: string): TldrawAgent | undefined {
		const agents = AgentAppAgentsManager.$agents.get(editor)
		return id ? agents.find((agent) => agent.id === id) : agents[0]
	}

	getAgents(): TldrawAgent[] {
		return AgentAppAgentsManager.getAgents(this.app.editor)
	}

	getAgent(id?: string): TldrawAgent | undefined {
		return AgentAppAgentsManager.getAgent(this.app.editor, id)
	}

	/** Create an agent with the given id, or return the existing one with that id. */
	createAgent(id: string): TldrawAgent {
		const existingAgent = this.getAgent(id)
		if (existingAgent) return existingAgent

		const agent = new TldrawAgent({
			editor: this.app.editor,
			id,
			onError: this.app.options.onError,
		})
		AgentAppAgentsManager.$agents.update(this.app.editor, (agents) => [...agents, agent])
		return agent
	}

	ensureAtLeastOneAgent(): TldrawAgent {
		return this.getAgent() ?? this.createAgent(uniqueId())
	}

	/** @returns whether an agent with that id existed. */
	deleteAgent(id: string): boolean {
		const agent = this.getAgent(id)
		if (!agent) return false

		agent.dispose()
		AgentAppAgentsManager.$agents.update(this.app.editor, (agents) =>
			agents.filter((a) => a.id !== id)
		)
		return true
	}

	/** Reset every agent's state without disposing them. */
	reset() {
		this.getAgents().forEach((agent) => agent.reset())
	}

	override dispose() {
		this.getAgents().forEach((agent) => agent.dispose())
		AgentAppAgentsManager.$agents.set(this.app.editor, [])
		super.dispose()
	}
}
