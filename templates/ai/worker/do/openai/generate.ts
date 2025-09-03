import { TLAiSerializedPrompt } from '@tldraw/ai'
import OpenAI from 'openai'
import { buildPromptMessages } from './prompt'
import { IModelResponse, ISimpleEvent, ModelResponse } from './schema'
import { OPENAI_SYSTEM_PROMPT } from './system-prompt'

const OPENAI_MODEL = 'gpt-4o-2024-08-06'

/**
 * Prompt the OpenAI model with the given prompt. Stream the events as they come back.
 */
export async function generateEvents(
	model: OpenAI,
	prompt: TLAiSerializedPrompt
): Promise<ISimpleEvent[]> {
	const response = await model.responses.create({
		model: OPENAI_MODEL,
		instructions: OPENAI_SYSTEM_PROMPT,
		input: buildPromptMessages(prompt),
		// response_format: RESPONSE_FORMAT,
	})

	const text = response.output_text ?? ''
	const json = JSON.parse(text) as IModelResponse

	try {
		ModelResponse.parse(json)
	} catch (err) {
		throw new Error(`Invalid response from OpenAI: ${err}`)
	}

	return json.events
}
