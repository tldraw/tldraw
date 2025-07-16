import { TLAiChange, TLAiPrompt, TLAiResult } from '@tldraw/ai'
import OpenAI from 'openai'
import { TldrawAiBaseService } from '../../TldrawAiBaseService'
import { Environment } from '../../types'
import { generateEvents } from './generate'
import { getTldrawAiChangesFromSimpleEvents } from './getTldrawAiChangesFromSimpleEvents'
import { streamEvents } from './stream'

export class OpenAiService extends TldrawAiBaseService {
	openai: OpenAI

	constructor(env: Environment) {
		super(env)
		this.openai = new OpenAI({
			apiKey: env.OPENAI_API_KEY,
		})
	}

	async generate(prompt: TLAiPrompt): Promise<TLAiResult> {
		const events = await generateEvents(this.openai, prompt)
		if (this.env.LOG_LEVEL === 'debug') console.log(events)
		const changes = events.map((event) => getTldrawAiChangesFromSimpleEvents(prompt, event)).flat()
		return { changes }
	}

	async *stream(prompt: TLAiPrompt): AsyncGenerator<TLAiChange> {
		for await (const simpleEvent of streamEvents(this.openai, prompt)) {
			if (this.env.LOG_LEVEL === 'debug') console.log(simpleEvent)
			for (const change of getTldrawAiChangesFromSimpleEvents(prompt, simpleEvent)) {
				yield change
			}
		}
	}
}
