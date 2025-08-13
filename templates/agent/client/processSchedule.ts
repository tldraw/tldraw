// import { useCallback } from 'react'
import { Box, Editor } from 'tldraw'
import { TLAgentModelName } from '../worker/models'
import { TLAgent } from './ai/useAgent'
// import { $chatHistoryItems } from './atoms/chatHistoryItems'
import { $pendingContextItems } from './atoms/contextItems'
import { $requestsSchedule } from './atoms/requestsSchedule'
import { $contextBoundsHighlight } from './components/highlights/ContextBoundsHighlights'

export async function processSchedule({
	editor,
	modelName,
	agent,
	rCancelFn,
}: {
	editor: Editor
	modelName: TLAgentModelName
	agent: TLAgent
	rCancelFn: React.MutableRefObject<(() => void) | null>
}) {
	const eventSchedule = $requestsSchedule.get()

	if (!eventSchedule || eventSchedule.length === 0) {
		return // Base case - no more events to process
	}

	// The next scheduled request
	const request = eventSchedule[0]
	// const intent = request.message

	$pendingContextItems.set(request.contextItems)
	const bounds = Box.From(request.bounds)

	$contextBoundsHighlight.set(bounds)

	/* request
		type
		message
		contextBounds (bounds)
		promptBounds (bounds)
		contextItems
	*/
	try {
		const { promise, cancel } = agent.prompt({
			modelName,
			request,

			// bye bye
			// message: intent, //request.message
			// contextBounds: bounds, //request.bounds
			// promptBounds: bounds, //request.bounds
			// contextItems: request.contextItems, //request.contextItems
			// type: request.type, //request.type

			// historyItems: $chatHistoryItems.get(), //bye bye
			// currentPageContent: getWholePageContent({ editor }), //bye bye
			// currentUserViewportBounds: editor.getViewportPageBounds(), //bye bye
			// userSelectedShapeIds: editor.getSelectedShapeIds().map((v) => structuredClone(v)) ?? [], //bye bye
		})

		rCancelFn.current = cancel
		await promise

		// Only remove the event after successful processing
		$requestsSchedule.update((prev) => prev.filter((_, i) => i !== 0))

		rCancelFn.current = null

		// Recursively process the next event
		await processSchedule({ editor, modelName, agent, rCancelFn })
	} catch (e) {
		rCancelFn.current = null
		$requestsSchedule.set([])
		if (
			e === 'Cancelled by user' ||
			(e instanceof Error && e.message === 'BodyStreamBuffer was aborted')
		) {
			return
		}
		throw e
	}
}
