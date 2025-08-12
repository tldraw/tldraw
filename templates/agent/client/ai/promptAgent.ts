import { structuredClone, uniqueId } from 'tldraw'
import { AgentTransform } from '../AgentTransform'
import { createOrUpdateHistoryItem } from '../atoms/chatHistoryItems'
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
	const { editor, eventUtils } = promptOptions
	let cancelled = false
	const controller = new AbortController()
	const signal = controller.signal
	const markId = 'generating_' + uniqueId()

	const transform = new AgentTransform(editor)

	const promise = new Promise<void>((resolve, reject) => {
		preparePrompt(promptOptions, transform)
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
								const eventUtil = event._type ? eventUtils.get(event._type) : null

								// If no event util is found, or the model hasn't specified an event type yet, add the raw event to the chat history.
								// This helps make the agent feel more responsive, as it causes the chat history to be populated as soon as possible.
								// On the other hand, displaying a raw event can be unhelpful, or look broken, so it's a trade-off.
								// We might want to remove this or replace it with something cleaner.
								if (!eventUtil) {
									if (event.complete) {
										console.log('UNHANDLED EVENT: ', event)
									}
									createOrUpdateHistoryItem({
										type: 'event',
										event,
										status: event.complete ? 'done' : 'progress',
									})
									return
								}

								// Transform the event
								const transformedEvent = eventUtil.transformEvent(event, transform)

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
									eventUtil.applyEvent(transformedEvent, transform)
								})

								if (
									Object.keys(diff.updated).length > 0 ||
									Object.keys(diff.removed).length > 0 ||
									Object.keys(diff.added).length > 0
								) {
									// If any canvas changes were made, add their diff to the chat history
									createOrUpdateHistoryItem({
										type: 'change',
										diff,
										event,
										acceptance: 'pending',
										status: event.complete ? 'done' : 'progress',
									})
								} else {
									createOrUpdateHistoryItem({
										type: 'event',
										event: transformedEvent,
										status: event.complete ? 'done' : 'progress',
									})
								}
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
