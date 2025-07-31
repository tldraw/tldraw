// import { useCallback } from 'react'
import { TldrawAi } from '@tldraw/ai'
import { Box, BoxModel, Editor } from 'tldraw'
import { TLAgentModelName } from '../worker/models'
import { getSimpleContentFromCanvasContent } from '../worker/simple/getSimpleContentFromCanvasContent'
import { $chatHistoryItems } from './atoms/chatHistoryItems'
import { $pendingContextItems } from './atoms/contextItems'
import { $requestsSchedule } from './atoms/requestsSchedule'
import { $contextBoundsHighlight } from './components/highlights/ContextBoundsHighlights'
import { ContextItem } from './types/ContextItem'

export async function processSchedule({
	editor,
	modelName,
	ai,
	rCancelFn,
}: {
	editor: Editor
	modelName: TLAgentModelName
	ai: TldrawAi
	rCancelFn: React.MutableRefObject<(() => void) | null>
}) {
	const eventSchedule = $requestsSchedule.get()

	if (!eventSchedule || eventSchedule.length === 0) {
		return // Base case - no more events to process
	}

	// The next scheduled request
	const request = eventSchedule[0]
	const intent = request.message

	$pendingContextItems.set(request.contextItems)
	const bounds = Box.From(request.bounds)

	$contextBoundsHighlight.set(bounds)

	try {
		const { promise, cancel } = ai.prompt({
			message: intent,
			stream: true,
			contextBounds: bounds,
			promptBounds: bounds,
			meta: {
				modelName,
				historyItems: $chatHistoryItems.get().filter((item) => item.type !== 'status-thinking'),
				contextItems: getSimpleContextItemsFromContextItems(request.contextItems),
				currentPageShapes: editor.getCurrentPageShapesSorted().map((v) => ({ ...v })),
				currentUserViewportBounds: editor.getViewportPageBounds(),
				type: request.type,
			},
		})

		$chatHistoryItems.update((prev) => [
			...prev,
			{
				type: 'status-thinking',
				message: request.type === 'review' ? 'Reviewing' : 'Generating',
				status: 'progress',
			},
		])

		rCancelFn.current = cancel
		await promise

		// Only remove the event after successful processing
		$requestsSchedule.update((prev) => prev.filter((_, i) => i !== 0))

		// Set previous status-thinking to done
		$chatHistoryItems.update((prev) => {
			const lastStatusThinkingIndex = [...prev]
				.reverse()
				.findIndex((item) => item.type === 'status-thinking' && item.status === 'progress')
			if (lastStatusThinkingIndex === -1) return prev
			const idx = prev.length - 1 - lastStatusThinkingIndex
			return prev.map((item, i) => (i === idx ? { ...item, status: 'done' } : item))
		})

		rCancelFn.current = null

		// Recursively process the next event
		await processSchedule({ editor, modelName, ai, rCancelFn })
	} catch (e) {
		rCancelFn.current = null
		// Remove the failed request from the schedule
		$requestsSchedule.update((prev) => prev.filter((_, i) => i !== 0))
		// Continue processing the next request
		console.error(e)
		throw e
	}
}

function getSimpleContextItemsFromContextItems(contextItems: ContextItem[]) {
	const shapeContextItems = contextItems.filter((item) => item.type === 'shape')
	const areaContextItems = contextItems.filter((item) => item.type === 'area')
	const pointContextItems = contextItems.filter((item) => item.type === 'point')

	const simpleContent = getSimpleContentFromCanvasContent({
		shapes: shapeContextItems.map((item) => item.shape),
		bindings: [],
		assets: [],
	})

	return {
		shapes: simpleContent.shapes,
		areas: areaContextItems.map((area) => roundBox(area.bounds)),
		points: pointContextItems.map((point) => point.point),
	}
}

function roundBox(box: BoxModel) {
	const b = { ...box }
	b.x = Math.round(b.x)
	b.y = Math.round(b.y)
	b.w = Math.round(b.w)
	b.h = Math.round(b.h)
	return b
}
