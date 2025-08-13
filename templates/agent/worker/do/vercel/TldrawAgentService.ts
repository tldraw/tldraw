import { AgentPrompt } from '../../../client/types/AgentPrompt'
import { Streaming } from '../../../client/types/Streaming'
import { IAgentEvent } from '../../prompt/AgentEvent'
import { Environment } from '../../types'

export abstract class TldrawAgentService {
	constructor(public env: Environment) {}

	abstract stream(prompt: AgentPrompt): AsyncGenerator<Streaming<IAgentEvent>>
}
