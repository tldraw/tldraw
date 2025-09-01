import { AgentRequest } from '../../shared/types/AgentRequest'
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
	agent.$agentViewportBoundsHighlight.set(request.bounds)
	agent.$pendingContextItems.set(request.contextItems)

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
			let scheduledRequest = agent.$scheduledRequest.get()
			if (!scheduledRequest) {
				const todoItemsRemaining = agent.$todoItems.get().filter((item) => item.status !== 'done')
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

			agent.$scheduledRequest.set(null)
			agent.$agentViewportBoundsHighlight.set(null)
			agent.$pendingContextItems.set([])

			const nextResult = advanceSchedule({ agent, request: scheduledRequest, onError })
			current.promise = nextResult.promise
			current.cancel = nextResult.cancel

			current.promise.then(resolve)
		})
	})

	return { promise, cancel }
}
