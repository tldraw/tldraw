import { structuredClone, uniqueId } from 'tldraw'
import { AgentTransform } from '../../shared/AgentTransform'
import { AgentPromptOptions } from '../../shared/types/AgentPrompt'
import { addEventToHistory } from '../atoms/chatHistoryItems'
import { preparePrompt } from './preparePrompt'
import { streamAgent } from './streamAgent'

/**
 * Prompt the agent with a request. The agent's response will be streamed back
 * to the chat panel and editor.
 *
 * @returns A promise that resolves when the prompt is complete.
 */
export function promptAgent(promptOptions: AgentPromptOptions) {
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

								if (!eventUtil) {
									if (event.complete) {
										console.log('UNHANDLED EVENT: ', event)
									}
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
									if (transformedEvent._type !== 'debug') {
										console.log('EVENT: ', originalEvent)
									}
								}

								// Apply the event to the app and editor
								const diff = editor.store.extractingChanges(() => {
									eventUtil.applyEvent(structuredClone(transformedEvent), transform)
								})

								// If any canvas changes were made, add their diff to the chat history
								if (eventUtil.savesToHistory()) {
									addEventToHistory(transformedEvent, diff)
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
