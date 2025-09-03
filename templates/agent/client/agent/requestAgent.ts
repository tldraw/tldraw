import { RecordsDiff, reverseRecordsDiff, structuredClone, TLRecord } from 'tldraw'
import { AgentTransform } from '../../shared/AgentTransform'
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

	const promise = new Promise<void>((resolve) => {
		agent.preparePrompt(request, transform).then(async (prompt) => {
			let prevDiff: RecordsDiff<TLRecord> | null = null
			try {
				for await (const action of streamAgent({ prompt, signal })) {
					if (cancelled) break
					const originalAction = structuredClone(action)
					editor.run(
						() => {
							const actionUtil = agent.getAgentActionUtil(action._type)

							// Transform the agent's action
							const transformedAction = actionUtil.transformAction(action, transform)
							if (!transformedAction) {
								if (action.complete) {
									console.log('REJECTED ACTION: ', action)
								}
								prevDiff = null
								return
							}

							if (transformedAction.complete) {
								if (transformedAction._type !== 'debug') {
									console.log('ACTION: ', originalAction)
								}
							}

							// If there was a diff from an incomplete action, revert it so that we can reapply the action
							if (prevDiff) {
								const inversePrevDiff = reverseRecordsDiff(prevDiff)
								editor.store.applyDiff(inversePrevDiff)
							}

							// Apply the action to the app and editor
							const diff = agent.act(transformedAction)

							// The the action is incomplete, save the diff so that we can revert it in the future
							prevDiff = transformedAction.complete ? null : diff
						},
						{
							ignoreShapeLock: false,
							history: 'ignore',
						}
					)
				}
				resolve()
			} catch (e) {
				if (e instanceof Error && e.name === 'AbortError') {
					console.log('CANCELLED')
					return
				}
				onError(e)
				resolve()
			}
		})
	})

	const cancel = () => {
		cancelled = true
		controller.abort('Cancelled by user')
	}

	return { promise, cancel }
}
