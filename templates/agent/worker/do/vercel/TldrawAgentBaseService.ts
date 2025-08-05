import { Streaming, TLAgentChange } from '../../../client/types/TLAgentChange'
import { TLAgentPrompt } from '../../../client/types/TLAgentPrompt'
import { Environment } from '../../types'

export abstract class TldrawAgentService {
	constructor(public env: Environment) {}

	abstract stream(prompt: TLAgentPrompt): AsyncGenerator<Streaming<TLAgentChange>>
}
