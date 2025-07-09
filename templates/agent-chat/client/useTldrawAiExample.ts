import { defaultApply, TLAiChange, TLAiResult, TldrawAiOptions, useTldrawAi } from '@tldraw/ai'
import { Editor } from 'tldraw'
import { useChatHistory } from './ChatHistoryContext'
import { ShapeDescriptions } from './transforms/ShapeDescriptions'
import { SimpleCoordinates } from './transforms/SimpleCoordinates'
import { SimpleIds } from './transforms/SimpleIds'

/**
 * A hook that calls `useTldrawAi` with static options.
 *
 * @param editor - (optional) The editor instance to use. If not provided, the hook will try to use the editor from React context.
 */
export function useTldrawAiExample(editor?: Editor) {
	const [, setHistoryItems] = useChatHistory()

	function apply({ change, editor }: { change: TLAiChange; editor: Editor }) {
		console.log(change)
		defaultApply({ change, editor })

		switch (change.type) {
			case 'custom': {
				switch (change.action) {
					case 'think': {
						setHistoryItems((prev) => [
							...prev,
							{ type: 'agent-action', action: 'thinking', status: 'done', info: change.text },
						])
						return
					}
					case 'plan': {
						setHistoryItems((prev) => [
							...prev,
							{ type: 'agent-action', action: 'planning', status: 'done', info: change.text },
						])
						return
					}
				}
				return
			}
			case 'createShape': {
				setHistoryItems((prev) => [
					...prev,
					{ type: 'agent-action', action: 'creating', status: 'done', info: change.description },
				])
				return
			}
			case 'updateShape': {
				setHistoryItems((prev) => [
					...prev,
					{ type: 'agent-action', action: 'updating', status: 'done', info: change.description },
				])
				return
			}
			case 'deleteShape': {
				setHistoryItems((prev) => [
					...prev,
					{ type: 'agent-action', action: 'deleting', status: 'done', info: change.description },
				])
				return
			}
		}
	}
	return useTldrawAi({ editor, apply, ...STATIC_TLDRAWAI_OPTIONS })
}

const STATIC_TLDRAWAI_OPTIONS: TldrawAiOptions = {
	transforms: [SimpleIds, ShapeDescriptions, SimpleCoordinates],

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
							const change: TLAiChange = JSON.parse(match[1])
							yield change
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
