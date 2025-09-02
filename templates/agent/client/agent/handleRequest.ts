import { AgentRequest } from '../../shared/types/AgentRequest'
import { TldrawAgent } from './TldrawAgent'

export async function handleRequest(agent: TldrawAgent, request: AgentRequest) {
	// Interrupt any currently active request
	if (agent.$activeRequest.get() !== null) {
		agent.cancel()
	}

	// Store the current request in the agent's state.
	agent.$activeRequest.set(request)

	// Submit the request to the agent.
	await agent.prompt(request)

	// After the request is handled, check if there are any outstanding todo items or requests
	let scheduledRequest = agent.$scheduledRequest.get()
	const todoItemsRemaining = agent.$todoList.get().filter((item) => item.status !== 'done')

	if (!scheduledRequest) {
		// If there no outstanding todo items or requests, finish
		if (todoItemsRemaining.length === 0) {
			agent.$activeRequest.set(null)
			return
		}

		// If there are outstanding todo items, schedule a continue request
		scheduledRequest = {
			message: request.message,
			contextItems: request.contextItems,
			bounds: request.bounds,
			modelName: request.modelName,
			selectedShapes: request.selectedShapes,
			type: 'todo',
		}
	}

	// Handle the scheduled request
	agent.$scheduledRequest.set(null)
	await handleRequest(agent, scheduledRequest)
}
