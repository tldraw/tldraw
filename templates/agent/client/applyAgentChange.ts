import { createOrUpdateHistoryItem } from './atoms/chatHistoryItems'
import { $requestsSchedule, ScheduledRequest } from './requestsSchedule'
import { Streaming, TLAgentChange } from './types/AgentChange'
import { AreaContextItem } from './types/ContextItem'

export function applyAgentChange(change: Streaming<TLAgentChange>) {
	switch (change.type) {
		case 'message': {
			createOrUpdateHistoryItem({
				type: 'agent-message',
				message: change.text ?? '',
				status: change.complete ? 'done' : 'progress',
			})
			return
		}
		case 'think': {
			createOrUpdateHistoryItem({
				type: 'agent-action',
				action: 'thinking',
				status: change.complete ? 'done' : 'progress',
				info: change.text ?? '',
			})
			return
		}
		case 'schedule': {
			createOrUpdateHistoryItem({
				type: 'agent-action',
				action: 'schedule',
				status: change.complete ? 'done' : 'progress',
				info: change.intent ?? '',
			})
			$requestsSchedule.update((prev) => {
				if (!change.complete) return prev
				const contextArea: AreaContextItem = {
					type: 'area',
					bounds: {
						x: change.x,
						y: change.y,
						w: change.w,
						h: change.h,
					},
					source: 'agent',
				}

				// Use the previous request's view bounds if it exists
				// Otherwise use the scheduled review's bounds
				const prevRequest = prev[prev.length - 1] ?? {
					bounds: {
						x: change.x,
						y: change.y,
						w: change.w,
						h: change.h,
					},
				}

				const schedule: ScheduledRequest[] = [
					...prev,
					{
						type: 'review',
						message: change.intent ?? '',
						contextItems: [contextArea],
						bounds: prevRequest.bounds,
					},
				]
				return schedule
			})
			return
		}
		case 'setMyView': {
			createOrUpdateHistoryItem({
				type: 'agent-action',
				action: 'setMyView',
				status: change.complete ? 'done' : 'progress',
				info: change.intent ?? '',
			})

			$requestsSchedule.update((prev) => {
				if (!change.complete) return prev

				const schedule: ScheduledRequest[] = [
					...prev,
					{
						type: 'setMyView',
						message: change.intent ?? '',
						contextItems: [],
						bounds: {
							x: change.x,
							y: change.y,
							w: change.w,
							h: change.h,
						},
					},
				]
				return schedule
			})
			return
		}
		// Ignore all AI changes
		// We'll handle them after transforms are applied
		case 'createShape':
		case 'updateShape':
		case 'deleteShape':
		case 'createBinding':
		case 'updateBinding':
		case 'deleteBinding': {
			return
		}
		default: {
			createOrUpdateHistoryItem({
				type: 'agent-raw',
				change,
				status: change.complete ? 'done' : 'progress',
			})
		}
	}
}
