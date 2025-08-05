import { Streaming, TLAgentChange } from '../client/types/TLAgentChange'
import { TLAgentPrompt } from '../client/useTldrawAgent'
import { Environment } from './types'

export abstract class TldrawAgentBaseService {
	constructor(public env: Environment) {}

	abstract generate(prompt: TLAgentPrompt): Promise<TLAgentChange[]>

	abstract stream(prompt: TLAgentPrompt): AsyncGenerator<Streaming<TLAgentChange>>
}
