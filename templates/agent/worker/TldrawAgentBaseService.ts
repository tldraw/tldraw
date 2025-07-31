import { Streaming, TLAgentChange } from '../client/types/TLAgentChange'
import { TLAgentSerializedPrompt } from '../client/types/TLAgentPrompt'
import { Environment } from './types'

export abstract class TldrawAgentBaseService {
	constructor(public env: Environment) {}

	abstract generate(prompt: TLAgentSerializedPrompt): Promise<TLAgentChange[]>

	abstract stream(prompt: TLAgentSerializedPrompt): AsyncGenerator<Streaming<TLAgentChange>>
}
