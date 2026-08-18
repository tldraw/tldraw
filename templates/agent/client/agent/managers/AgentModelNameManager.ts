import { Atom, atom } from 'tldraw'
import { AgentModelName, DEFAULT_MODEL_NAME, isValidModelName } from '../../../shared/models'
import type { TldrawAgent } from '../TldrawAgent'
import { BaseAgentManager } from './BaseAgentManager'

/**
 * The model the user has selected. Prompt part utils may override this; see
 * ModelNamePartUtil.
 */
export class AgentModelNameManager extends BaseAgentManager {
	private $modelName: Atom<AgentModelName>

	constructor(agent: TldrawAgent) {
		super(agent)
		this.$modelName = atom<AgentModelName>('modelName', DEFAULT_MODEL_NAME)
	}

	getModelName(): AgentModelName {
		return this.$modelName.get()
	}

	setModelName(modelName: AgentModelName): void {
		// A persisted selection from an older version may name a model that no
		// longer exists. Fall back to the default rather than holding an unknown
		// model name that would later fail when sent to the worker.
		this.$modelName.set(isValidModelName(modelName) ? modelName : DEFAULT_MODEL_NAME)
	}

	reset(): void {
		this.$modelName.set(DEFAULT_MODEL_NAME)
	}
}
