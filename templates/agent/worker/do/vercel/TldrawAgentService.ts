import { AgentEvent } from '../../../shared/types/AgentEvent'
import { AgentPrompt } from '../../../shared/types/AgentPrompt'
import { Streaming } from '../../../shared/types/Streaming'
import { Environment } from '../../types'

export abstract class TldrawAgentService {
	constructor(public env: Environment) {}

	abstract stream(prompt: AgentPrompt): AsyncGenerator<Streaming<AgentEvent>>
}
