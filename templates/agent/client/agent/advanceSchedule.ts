import { AgentRequest } from '../../shared/types/AgentRequest'
import { $agentViewportBoundsHighlight } from '../atoms/agentViewportBoundsHighlight'
import { $pendingContextItems } from '../atoms/contextItems'
import { $scheduledRequest } from '../atoms/scheduledRequest'
import { $todoItems } from '../atoms/todoItems'
import { TldrawAgent } from './TldrawAgent'

export function advanceSchedule({
	agent,
	request,
	onError,
}: {
	agent: TldrawAgent
	request: AgentRequest
	onError: (e: any) => void
}) {
	$agentViewportBoundsHighlight.set(request.bounds)
	$pendingContextItems.set(request.contextItems)

	const current = {
		promise: Promise.resolve(),
		cancel: () => {},
	}

	const cancel = () => {
		current.cancel()
	}

	const promise = new Promise<void>((resolve) => {
		const result = agent.prompt(request)
		current.promise = result.promise
		current.cancel = result.cancel

		current.promise.then(() => {
			let scheduledRequest = $scheduledRequest.get()
			if (!scheduledRequest) {
				const todoItemsRemaining = $todoItems.get().filter((item) => item.status !== 'done')
				if (todoItemsRemaining.length === 0) {
					resolve()
					return
				}

				scheduledRequest = {
					message: request.message,
					contextItems: request.contextItems,
					bounds: request.bounds,
					modelName: request.modelName,
					type: 'continue',
				}
			}

			$scheduledRequest.set(null)
			$agentViewportBoundsHighlight.set(null)
			$pendingContextItems.set([])

			const nextResult = advanceSchedule({ agent, request: scheduledRequest, onError })
			current.promise = nextResult.promise
			current.cancel = nextResult.cancel

			current.promise.then(resolve)
		})
	})

	return { promise, cancel }
}
