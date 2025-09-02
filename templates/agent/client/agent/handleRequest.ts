import { AgentRequest } from '../../shared/types/AgentRequest'
import { TldrawAgent } from './TldrawAgent'

export function handleRequest({
	agent,
	request,
	onError,
}: {
	agent: TldrawAgent
	request: AgentRequest
	onError: (e: any) => void
}) {
	// Store the current request in the agent's state.
	agent.$currentRequest.set(request)

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
				const todoItemsRemaining = agent.$todoList.get().filter((item) => item.status !== 'done')
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

			// We're starting the schedule request now, so we can clear it from the agent's state.
			agent.$scheduledRequest.set(null)

			const nextResult = handleRequest({ agent, request: scheduledRequest, onError })
			current.promise = nextResult.promise
			current.cancel = nextResult.cancel

			current.promise.then(resolve)
		})
	})

	return { promise, cancel }
}
