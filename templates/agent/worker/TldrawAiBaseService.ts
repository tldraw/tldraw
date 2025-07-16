import { TLAiChange, TLAiPrompt, TLAiResult } from '@tldraw/ai'
import { Environment } from './types'

export abstract class TldrawAiBaseService {
	constructor(public env: Environment) {}

	abstract generate(prompt: TLAiPrompt): Promise<TLAiResult>

	abstract stream(prompt: TLAiPrompt): AsyncGenerator<TLAiChange>
}
