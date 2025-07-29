import { TLAiSerializedPrompt } from '@tldraw/ai'
import { TLAgentChange, TLAgentStreamingChange } from '../client/applyAgentChange'
import { Environment } from './types'

export abstract class TldrawAiBaseService {
	constructor(public env: Environment) {}

	abstract generate(prompt: TLAiSerializedPrompt): Promise<TLAgentChange[]>

	abstract stream(prompt: TLAiSerializedPrompt): AsyncGenerator<TLAgentStreamingChange>
}
