import { Editor } from 'tldraw'
import { AgentModelName } from '../../worker/models'
import { $pendingContextItems } from '../atoms/contextItems'
import { $scheduledRequests } from '../atoms/scheduledRequests'
import { $todoItems } from '../atoms/todoItems'
import { $contextBoundsHighlight } from '../components/highlights/ContextBoundsHighlights'
import { TLAgent } from './useTldrawAgent'

export async function advanceSchedule({
	editor,
	modelName,
	agent,
	rCancelFn,
}: {
	editor: Editor
	modelName: AgentModelName
	agent: TLAgent
	rCancelFn: React.MutableRefObject<(() => void) | null>
}) {
	const request = $scheduledRequests.get()[0]
	if (!request) {
		return
	}

	$contextBoundsHighlight.set(request.bounds)
	$pendingContextItems.set(request.contextItems)

	try {
		const { promise, cancel } = agent.prompt(request)

		rCancelFn.current = cancel
		await promise
		rCancelFn.current = null

		// Only remove the event after successful processing
		$scheduledRequests.update((prev) => prev.filter((_, i) => i !== 0))

		const outstandingTodoItems = $todoItems.get().filter((item) => item.status !== 'done')
		if ($scheduledRequests.get().length === 0 && outstandingTodoItems.length > 0) {
			// If there are still outstanding todo items, we need to keep going!
			$scheduledRequests.set([
				{
					message: 'There are still outstanding todo items. Please continue.',
					contextItems: request.contextItems,
					bounds: request.bounds,
					type: 'continue',
				},
			])
		}

		// Recursively process the next event
		await advanceSchedule({ editor, modelName, agent, rCancelFn })
	} catch (e) {
		rCancelFn.current = null
		$scheduledRequests.set([])
		if (
			e === 'Cancelled by user' ||
			(e instanceof Error && e.message === 'BodyStreamBuffer was aborted')
		) {
			return
		}
		throw e
	}
}
