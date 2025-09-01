import { Editor, RecordsDiff, reverseRecordsDiff, structuredClone, TLRecord } from 'tldraw'
import { AgentActionUtil } from '../../shared/actions/AgentActionUtil'
import { AgentTransform } from '../../shared/AgentTransform'
import { PromptPartUtil } from '../../shared/parts/PromptPartUtil'
import { AgentAction } from '../../shared/types/AgentAction'
import { AgentRequest } from '../../shared/types/AgentRequest'
import { IChatHistoryItem } from '../../shared/types/ChatHistoryItem'
import { PromptPart } from '../../shared/types/PromptPart'
import { $chatHistoryItems } from '../atoms/chatHistoryItems'
import { preparePrompt } from './preparePrompt'
import { streamAgent } from './streamAgent'

/**
 * Prompt the agent with a request. The agent's response will be streamed back
 * to the chat panel and editor.
 *
 * @returns A promise that resolves when the prompt is complete and a cancel function to abort the request.
 */
export function promptAgent({
	editor,
	agentActionsUtils,
	promptPartUtils,
	request,
	onError,
}: {
	editor: Editor
	agentActionsUtils: Record<AgentAction['_type'], AgentActionUtil<AgentAction>>
	promptPartUtils: Record<PromptPart['type'], PromptPartUtil<PromptPart>>
	request: AgentRequest
	onError: (e: any) => void
}) {
	let cancelled = false
	const controller = new AbortController()
	const signal = controller.signal
	const transform = new AgentTransform(editor)

	const promise = new Promise<void>((resolve) => {
		preparePrompt({ editor, request, transform, promptPartUtils }).then(async (prompt) => {
			let prevDiff: RecordsDiff<TLRecord> | null = null
			try {
				for await (const action of streamAgent({ prompt, signal })) {
					if (cancelled) break
					const originalAction = structuredClone(action)
					editor.run(
						() => {
							const actionUtil = action._type ? agentActionsUtils[action._type] : null

							if (!actionUtil) {
								if (action.complete) {
									console.log('UNHANDLED ACTION: ', action)
								}
								return
							}

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
							const diff = editor.store.extractingChanges(() => {
								actionUtil.applyAction(structuredClone(transformedAction), transform, request)
							})

							// The the action is incomplete, save the diff so that we can revert it in the future
							prevDiff = transformedAction.complete ? null : diff

							// Add the action to chat history
							if (actionUtil.savesToHistory()) {
								const historyItem: IChatHistoryItem = {
									type: 'action',
									action: transformedAction,
									diff,
									acceptance: 'pending',
								}

								$chatHistoryItems.update((items) => {
									// If there are no items, start off the chat history with the first item
									if (items.length === 0) return [historyItem]

									// If the last item is still in progress, replace it with the new item
									const lastItem = items.at(-1)
									if (lastItem && lastItem.type === 'action' && !lastItem.action.complete) {
										return [...items.slice(0, -1), historyItem]
									}

									// Otherwise, just add the new item to the end of the list
									return [...items, historyItem]
								})
							}
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

	return {
		// the promise that will resolve the changes
		promise,
		// a helper to cancel the request
		cancel,
	}
}
