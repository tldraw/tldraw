import { TLAiChange, TldrawAiOptions, useTldrawAi } from '@tldraw/ai'
import { Editor } from 'tldraw'
import { applyAgentChange } from './applyAgentChange'
import { applyAiChange } from './applyAiChange'
import { SimplishCoordinates } from './transforms/SimplishCoordinates'
import { SimplishIds } from './transforms/SimplishIds'
import { Streaming, TLAgentChange } from './types/AgentChange'

/**
 * A hook that calls `useTldrawAi` with static options.
 *
 * @param editor - (optional) The editor instance to use. If not provided, the hook will try to use the editor from React context.
 */
export function useTldrawAgent(editor?: Editor) {
	return useTldrawAi({ editor, ...STATIC_TLDRAWAI_OPTIONS })
}

const STATIC_TLDRAWAI_OPTIONS: TldrawAiOptions = {
	transforms: [SimplishIds, SimplishCoordinates],
	apply: applyAiChange,

	// A function that calls the backend and return generated changes.
	// See worker/do/OpenAiService.ts#generate for the backend part.
	generate: async ({ prompt, signal }) => {
		const res = await fetch('/generate', {
			method: 'POST',
			body: JSON.stringify(prompt),
			headers: {
				'Content-Type': 'application/json',
			},
			signal,
		})

		if (!res.ok) {
			const errorData = (await res.json().catch(() => ({ error: 'Unknown error' }))) as any
			throw new Error(errorData.error || `HTTP ${res.status}: ${res.statusText}`)
		}

		const agentChanges = (await res.json()) as TLAgentChange[]

		// Check if the response contains an error
		if ('error' in agentChanges) {
			throw new Error((agentChanges as any).error)
		}

		for (const change of agentChanges) {
			applyAgentChange({ ...change, complete: true })
		}
		return getAiChangesFromAgentChanges(agentChanges)
	},
	// A function similar to `generate` but that will stream changes from
	// the AI as they are ready. See worker/do/OpenAiService.ts#stream for
	// the backend part.
	stream: async function* ({ prompt, signal }) {
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
				const events = buffer.split('\n\n')
				buffer = events.pop() || ''

				for (const event of events) {
					const match = event.match(/^data: (.+)$/m)
					if (match) {
						try {
							const data = JSON.parse(match[1])

							// If the response contains an error, throw it
							if ('error' in data) {
								throw new Error(data.error)
							}

							// Otherwise, it's a regular agent change
							const agentChange: Streaming<TLAgentChange> = data
							applyAgentChange(agentChange)

							const aiChange = getAiChangeFromAgentChange(agentChange)
							if (aiChange) {
								yield aiChange
							}
						} catch (err: any) {
							throw new Error(err.message)
						}
					}
				}
			}
		} finally {
			reader.releaseLock()
		}
	},
}

function getAiChangesFromAgentChanges(changes: TLAgentChange[]): TLAiChange[] {
	return changes
		.map((change) => getAiChangeFromAgentChange(change))
		.filter((change) => change !== null)
}

function getAiChangeFromAgentChange(
	change: Streaming<TLAgentChange> | (TLAgentChange & { complete?: boolean })
): TLAiChange | null {
	if (!change.complete) return null
	switch (change.type) {
		case 'createShape':
		case 'updateShape':
		case 'deleteShape':
		case 'createBinding':
		case 'updateBinding':
		case 'deleteBinding': {
			return change
		}
	}
	return null
}
