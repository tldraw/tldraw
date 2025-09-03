import { AgentAction } from '../../shared/types/AgentAction'
import { BaseAgentPrompt } from '../../shared/types/AgentPrompt'
import { Streaming } from '../../shared/types/Streaming'

/**
 * Stream a response from the model.
 * Act on the model's events as they come in.
 *
 * This is a helper function that is used internally by the agent.
 *
 * @param prompt - The prompt to send to the model.
 * @param signal - The abort signal to use to cancel the request.
 * @returns An async generator that yields the agent's actions as they come in.
 */
export async function* streamAgent({
	prompt,
	signal,
}: {
	prompt: BaseAgentPrompt
	signal: AbortSignal
}): AsyncGenerator<Streaming<AgentAction>> {
	const res = await fetch('/stream', {
		method: 'POST',
		body: JSON.stringify(prompt),
		headers: {
			'Content-Type': 'application/json',
		},
		signal,
	})

	if (!res.body) {
		throw Error('No body in response')
	}

	const reader = res.body.getReader()
	const decoder = new TextDecoder()
	let buffer = ''

	try {
		while (true) {
			const { value, done } = await reader.read()
			if (done) break

			buffer += decoder.decode(value, { stream: true })
			const actions = buffer.split('\n\n')
			buffer = actions.pop() || ''

			for (const action of actions) {
				const match = action.match(/^data: (.+)$/m)
				if (match) {
					try {
						const data = JSON.parse(match[1])

						// If the response contains an error, throw it
						if ('error' in data) {
							throw new Error(data.error)
						}

						const agentAction: Streaming<AgentAction> = data
						yield agentAction
					} catch (err: any) {
						throw new Error(err.message)
					}
				}
			}
		}
	} finally {
		reader.releaseLock()
	}
}
