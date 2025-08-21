import { RecordsDiff, reverseRecordsDiff, structuredClone, TLRecord, uniqueId } from 'tldraw'
import { AgentTransform } from '../../shared/AgentTransform'
import { AgentHistoryItem } from '../../shared/types/AgentHistoryItem'
import { AgentPromptOptions } from '../../shared/types/AgentPrompt'
import { $agentHistoryItems } from '../atoms/agentHistoryItems'
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
				let prevDiff: RecordsDiff<TLRecord> | null = null
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
									prevDiff = null
									return
								}

								if (transformedEvent.complete) {
									if (transformedEvent._type !== 'debug') {
										console.log('EVENT: ', originalEvent)
									}
								}

								// If there was a diff from an incomplete event, revert it so that we can reapply the event
								if (prevDiff) {
									const inversePrevDiff = reverseRecordsDiff(prevDiff)
									editor.store.applyDiff(inversePrevDiff)
								}

								// Apply the event to the app and editor
								const diff = editor.store.extractingChanges(() => {
									eventUtil.applyEvent(structuredClone(transformedEvent), transform)
								})

								// The the event is incomplete, save the diff so that we can revert it in the future
								prevDiff = transformedEvent.complete ? null : diff

								// Add the event to chat history
								if (eventUtil.savesToHistory()) {
									const historyItem: AgentHistoryItem = {
										type: 'action',
										action: event,
										diff,
										acceptance: 'pending',
										status: event.complete ? 'done' : 'progress',
									}

									$agentHistoryItems.update((items) => {
										// If there are no items, start off the chat history with the first item
										if (items.length === 0) return [historyItem]

										// If the last item is still in progress, replace it with the new item
										const lastItem = items.at(-1)
										if (lastItem?.status === 'progress') {
											return [...items.slice(0, -1), historyItem]
										}

										// Otherwise, just add the new item to the end of the list
										return [...items, historyItem]
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
