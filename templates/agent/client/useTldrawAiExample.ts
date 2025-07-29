import { TLAiChange, TLAiResult, TldrawAiOptions, useTldrawAi } from '@tldraw/ai'
import { Editor } from 'tldraw'
import { Streaming, TLAgentChange } from './AgentChange'
import { applyAgentChange } from './applyAgentChange'
import { applyAiChange } from './applyAiChange'
import { SimplishCoordinates } from './transforms/SimplishCoordinates'
import { SimplishIds } from './transforms/SimplishIds'

/**
 * A hook that calls `useTldrawAi` with static options.
 *
 * @param editor - (optional) The editor instance to use. If not provided, the hook will try to use the editor from React context.
 */
export function useTldrawAiExample(editor?: Editor) {
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

		const result: TLAiResult = await res.json()

		return result.changes
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
							const agentChange: Streaming<TLAgentChange> = JSON.parse(match[1])
							applyAgentChange(agentChange)

							const aiChange = getAiChangeFromAgentChange(agentChange)
							if (aiChange) {
								yield aiChange
							}
						} catch (err) {
							console.error(err)
							throw Error(`JSON parsing error: ${match[1]}`)
						}
					}
				}
			}
		} finally {
			reader.releaseLock()
		}
	},
}

function getAiChangeFromAgentChange(change: Streaming<TLAgentChange>): TLAiChange | null {
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
