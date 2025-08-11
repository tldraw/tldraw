import { structuredClone, uniqueId } from 'tldraw'
import { createOrUpdateHistoryItem } from '../atoms/chatHistoryItems'
import { AgentEventHandler } from '../events/AgentEventHandler'
import { AgentTransform } from '../transforms/AgentTransform'
import { TLAgentPromptOptions } from '../types/TLAgentPrompt'
import { preparePrompt } from './preparePrompt'
import { streamAgent } from './streamAgent'

/**
 * Prompt the agent with a request. The agent's response will be streamed back
 * to the chat panel and editor.
 *
 * @returns A promise that resolves when the prompt is complete.
 */
export function promptAgent(promptOptions: TLAgentPromptOptions) {
	const { editor } = promptOptions
	let cancelled = false
	const controller = new AbortController()
	const signal = controller.signal
	const markId = 'generating_' + uniqueId()

	const transform = new AgentTransform(editor)

	const eventHandlers = new Map<string, AgentEventHandler>()
	for (const eventHandlerConstructor of promptOptions.events) {
		eventHandlers.set(eventHandlerConstructor.type, new eventHandlerConstructor(editor, transform))
	}

	const promise = new Promise<void>((resolve, reject) => {
		preparePrompt(promptOptions)
			.then(async (prompt) => {
				editor.markHistoryStoppingPoint(markId)
				for await (const event of streamAgent({
					prompt,
					signal,
				})) {
					if (cancelled) break
					const originalEvent = structuredClone(event)
					try {
						editor.run(
							() => {
								const eventHandler = event._type ? eventHandlers.get(event._type) : null

								// If no event handler found, or the model hasn't specified an event type yet, add the raw event to the chat history.
								// This helps make the agent feel more responsive, as it causes the chat history to be populated as soon as possible.
								// On the other hand, displaying a raw event can be unhelpful, or look broken, so it's a trade-off.
								// We might want to remove this or replace it with something cleaner.
								if (!eventHandler) {
									if (event.complete) {
										console.log('UNHANDLED EVENT: ', event)
									}
									createOrUpdateHistoryItem({
										type: 'agent-raw',
										event,
										status: event.complete ? 'done' : 'progress',
									})
									return
								}

								// Transform the event
								const transformedEvent = eventHandler.transformEvent(event)

								if (!transformedEvent) {
									if (event.complete) {
										console.log('REJECTED EVENT: ', event)
									}
									return
								}

								if (transformedEvent.complete) {
									console.log(
										'EVENT: ',
										originalEvent,
										'TRANSFORMED EVENT: ',
										structuredClone(transformedEvent)
									)
								}

								// Apply the event to the app and editor
								const diff = editor.store.extractingChanges(() => {
									eventHandler.applyEvent(transformedEvent)
								})

								// If any canvas changes were made, add their diff to the chat history
								createOrUpdateHistoryItem({
									type: 'agent-change',
									diff,
									event,
									status: event.complete ? 'done' : 'progress',
									acceptance: 'pending',
								})
							},
							{
								ignoreShapeLock: false,
								history: 'record',
							}
						)
					} catch (e) {
						// If we encounter an error, revert previous changes and throw the error
						editor.bailToMark(markId)
						throw e
					}
				}

				resolve()
			})
			.catch((e) => {
				editor.bailToMark(markId)
				reject(e)
			})
	})

	const cancel = () => {
		cancelled = true
		controller.abort('Cancelled by user')
		editor.bailToMark(markId)
	}

	return {
		// the promise that will resolve the changes
		promise,
		// a helper to cancel the request
		cancel,
	}
}
