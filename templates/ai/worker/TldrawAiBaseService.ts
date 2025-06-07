import { TLAiChange, TLAiResult, TLAiSerializedPrompt } from '@tldraw/ai'
import { Environment } from './types'

export abstract class TldrawAiBaseService {
	constructor(public env: Environment) {}

	abstract generate(prompt: TLAiSerializedPrompt): Promise<TLAiResult>

	abstract stream(prompt: TLAiSerializedPrompt): AsyncGenerator<TLAiChange>
}
