import { Streaming } from '../../../client/types/Streaming'
import { TLAgentPrompt } from '../../../client/types/TLAgentPrompt'
import { IAgentEvent } from '../../prompt/AgentEvent'
import { Environment } from '../../types'

export abstract class TldrawAgentService {
	constructor(public env: Environment) {}

	abstract stream(prompt: TLAgentPrompt): AsyncGenerator<Streaming<IAgentEvent>>
}
