import { RecordsDiff, reverseRecordsDiff, TLRecord } from 'tldraw'
import { AgentTransform } from '../../shared/AgentTransform'
import { AgentActionResult } from '../../shared/types/AgentActionResult'
import { AgentRequest } from '../../shared/types/AgentRequest'
import { IChatHistoryItem } from '../../shared/types/ChatHistoryItem'
import { streamAgent } from './streamAgent'
import { TldrawAgent } from './TldrawAgent'

/**
 * Send a request to the agent and handle its response.
 * This is a helper function that is used internally by the agent.
 *
 * @param agent - The agent to send the request to.
 * @param request - The request to send to the agent.
 * @param onError - A callback to call if an error occurs.
 * @returns A promise for the request and a function to cancel it.
 */
export function requestAgent({
	agent,
	request,
	onError,
}: {
	agent: TldrawAgent
	request: AgentRequest
	onError: (e: any) => void
}) {
	const { editor } = agent

	// If the request is from the user, add it to chat history
	if (request.type === 'user') {
		const promptHistoryItem: IChatHistoryItem = {
			type: 'prompt',
			message: request.message,
			contextItems: request.contextItems,
			selectedShapes: request.selectedShapes,
		}
		agent.$chatHistory.update((prev) => [...prev, promptHistoryItem])
	}

	let cancelled = false
	const controller = new AbortController()
	const signal = controller.signal
	const transform = new AgentTransform(agent)

	const promise = new Promise<AgentActionResult[]>((resolve) => {
		agent.preparePrompt(request, transform).then(async (prompt) => {
			let incompleteDiff: RecordsDiff<TLRecord> | null = null
			const results: AgentActionResult[] = []
			try {
				for await (const action of streamAgent({ prompt, signal })) {
					if (cancelled) break
					editor.run(
						() => {
							const actionUtil = agent.getAgentActionUtil(action._type)

							// Transform the agent's action
							const transformedAction = actionUtil.sanitizeAction(action, transform)
							if (!transformedAction) {
								incompleteDiff = null
								return
							}

							// If there was a diff from an incomplete action, revert it so that we can reapply the action
							if (incompleteDiff) {
								const inversePrevDiff = reverseRecordsDiff(incompleteDiff)
								editor.store.applyDiff(inversePrevDiff)
							}

							// Apply the action to the app and editor
							const result = agent.act(transformedAction, transform)

							// The the action is incomplete, save the diff so that we can revert it in the future
							if (transformedAction.complete) {
								results.push(result)
								incompleteDiff = null
							} else {
								incompleteDiff = result.diff
							}
						},
						{
							ignoreShapeLock: false,
							history: 'ignore',
						}
					)
				}
				resolve(results)
			} catch (e) {
				if (e === 'Cancelled by user' || (e instanceof Error && e.name === 'AbortError')) {
					return
				}
				onError(e)
				resolve(results)
			}
		})
	})

	const cancel = () => {
		cancelled = true
		controller.abort('Cancelled by user')
	}

	return { promise, cancel }
}
