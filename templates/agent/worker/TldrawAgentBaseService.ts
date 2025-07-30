import { TLAiSerializedPrompt } from '@tldraw/ai'
import { Streaming, TLAgentChange } from '../client/types/AgentChange'
import { Environment } from './types'

export abstract class TldrawAgentBaseService {
	constructor(public env: Environment) {}

	abstract generate(prompt: TLAiSerializedPrompt): Promise<TLAgentChange[]>

	abstract stream(prompt: TLAiSerializedPrompt): AsyncGenerator<Streaming<TLAgentChange>>
}
