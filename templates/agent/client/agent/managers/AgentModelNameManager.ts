import { Atom, atom } from 'tldraw'
import { AgentModelName, DEFAULT_MODEL_NAME, isValidModelName } from '../../../shared/models'
import type { TldrawAgent } from '../TldrawAgent'
import { BaseAgentManager } from './BaseAgentManager'

/**
 * Manages the model name selection for an agent.
 * The model name determines which AI model is used to generate responses.
 */
export class AgentModelNameManager extends BaseAgentManager {
	/**
	 * An atom containing the model name that the user has selected.
	 * This gets passed through to prompts unless manually overridden.
	 *
	 * Note: Prompt part utils may ignore or override this value. See the
	 * ModelNamePartUtil for an example.
	 */
	private $modelName: Atom<AgentModelName>

	/**
	 * Creates a new model name manager for the given agent.
	 * Initializes with the default model name.
	 */
	constructor(agent: TldrawAgent) {
		super(agent)
		this.$modelName = atom<AgentModelName>('modelName', DEFAULT_MODEL_NAME)
	}

	/**
	 * Get the current model name.
	 * @returns The currently selected model name.
	 */
	getModelName(): AgentModelName {
		return this.$modelName.get()
	}

	/**
	 * Set the model name.
	 * @param modelName - The model name to set.
	 */
	setModelName(modelName: AgentModelName): void {
		// A persisted selection from an older version may name a model that no
		// longer exists. Fall back to the default rather than holding an unknown
		// model name that would later fail when sent to the worker.
		this.$modelName.set(isValidModelName(modelName) ? modelName : DEFAULT_MODEL_NAME)
	}

	/**
	 * Reset the model name manager to its initial state.
	 * Sets the model name back to the default.
	 */
	reset(): void {
		this.$modelName.set(DEFAULT_MODEL_NAME)
	}
}
