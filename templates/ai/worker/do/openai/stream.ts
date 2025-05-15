import { TLAiSerializedPrompt } from '@tldraw/ai'
import { parse } from 'best-effort-json-parser'
import OpenAI from 'openai'
import { buildPromptMessages } from './prompt'
import { ISimpleEvent, RESPONSE_FORMAT, SimpleEvent } from './schema'

const OPENAI_MODEL = 'gpt-4o-2024-08-06'

/**
 * Prompt the OpenAI model with the given prompt. Stream the events as they come back.
 */
export async function* streamEvents(
	model: OpenAI,
	prompt: TLAiSerializedPrompt
): AsyncGenerator<ISimpleEvent> {
	const stream = model.beta.chat.completions.stream({
		model: OPENAI_MODEL,
		messages: buildPromptMessages(prompt),
		response_format: RESPONSE_FORMAT,
	})

	let accumulatedText = '' // Buffer for incoming chunks
	let cursor = 0

	const events: ISimpleEvent[] = []
	let maybeUnfinishedEvent: ISimpleEvent | null = null

	// Process the stream as chunks arrive
	for await (const chunk of stream) {
		if (!chunk) continue

		// Add the text to the accumulated text
		accumulatedText += chunk.choices[0]?.delta?.content ?? ''

		// Even though the accumulated text is incomplete JSON, try to extract data
		const json = parse(accumulatedText)

		// If we have events, iterate over the events...
		if (Array.isArray(json?.events)) {
			// Starting at the current cursor, iterate over the events
			for (let i = cursor, len = json.events.length; i < len; i++) {
				const part = json.events[i]
				if (i === cursor) {
					try {
						// Check whether it's a valid event using our schema
						SimpleEvent.parse(part)

						if (i < len) {
							// If this is valid AND there are additional events, we're done with this one
							events.push(part)
							yield part
							maybeUnfinishedEvent = null
							cursor++
						} else {
							// This is the last event we've seen so far, so it might still be cooking
							maybeUnfinishedEvent = part
						}
					} catch {
						// noop but okay, it's just not done enough to be a valid event
					}
				}
			}
		}
	}

	// If we still have an event, then it was the last event to be seen as a JSON object
	// and so we couldn't be sure it was done using the "additional items" check in our loop.
	// We're now done with the items though, so we can yield it now
	if (maybeUnfinishedEvent) {
		events.push(maybeUnfinishedEvent)
		yield maybeUnfinishedEvent
	}

	return events
}
