import { uniqueId } from 'tldraw'
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

	const promise = new Promise<void>((resolve, reject) => {
		preparePrompt(promptOptions)
			.then(async ({ transformEvent, prompt }) => {
				// Handle a stream of changes
				// todo: consider history while streaming... we could keep track of all of the changes that were made, apply them as they come in; and then once completed, revert those changes, make a history entry, and then reapply them all

				editor.markHistoryStoppingPoint(markId)
				for await (const event of streamAgent({
					prompt,
					signal,
				})) {
					if (cancelled) break
					try {
						editor.run(
							() => {
								promptOptions.apply({ editor, event, transformEvent })
							},
							{
								ignoreShapeLock: false, // ? should this be true?
								history: 'record', // ? should this be 'ignore'?
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
