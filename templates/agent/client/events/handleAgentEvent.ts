import { defaultApplyChange } from '@tldraw/ai'
import { Editor, exhaustiveSwitchError, TLShapeId } from 'tldraw'
import { IAgentEvent } from '../../worker/prompt/AgentEvent'
import { createOrUpdateHistoryItem } from '../atoms/chatHistoryItems'
import { asRichText } from '../transforms/SimpleText'
import { Streaming } from '../types/Streaming'
import { getTldrawAiChangesFromCreateEvent } from './getTldrawAiChangesFromCreateEvent'
import { getTldrawAiChangesFromUpdateEvent } from './getTldrawAiChangesFromUpdateEvent'
import { placeShape } from './placeShape'
import { runAsAgent } from './runAsAgent'
import { scheduleReview } from './scheduleReview'
import { scheduleSetMyView } from './scheduleSetMyView'

export function handleAgentEvent(editor: Editor, event: Streaming<IAgentEvent>) {
	switch (event._type) {
		case 'create': {
			runAsAgent(editor, event, () => {
				if (!event.complete) return
				const aiChanges = getTldrawAiChangesFromCreateEvent({ editor, agentChange: event })
				for (const aiChange of aiChanges) {
					defaultApplyChange({ change: aiChange, editor })
				}
			})
			break
		}
		case 'update': {
			runAsAgent(editor, event, () => {
				if (!event.complete) return
				const aiChanges = getTldrawAiChangesFromUpdateEvent({ editor, agentChange: event })
				for (const aiChange of aiChanges) {
					defaultApplyChange({ change: aiChange, editor })
				}
			})
			break
		}
		case 'message': {
			createOrUpdateHistoryItem({
				type: 'agent-message',
				message: event.text ?? '',
				status: event.complete ? 'done' : 'progress',
			})
			break
		}
		case 'think': {
			createOrUpdateHistoryItem({
				type: 'agent-action',
				action: 'thinking',
				status: event.complete ? 'done' : 'progress',
				info: event.text ?? '',
			})
			break
		}
		case 'review': {
			scheduleReview(event)
			createOrUpdateHistoryItem({
				type: 'agent-action',
				action: 'review',
				status: event.complete ? 'done' : 'progress',
				info: event.intent ?? '',
			})
			break
		}
		case 'setMyView': {
			scheduleSetMyView(event)
			createOrUpdateHistoryItem({
				type: 'agent-action',
				action: 'setMyView',
				status: event.complete ? 'done' : 'progress',
				info: event.intent ?? '',
			})
			break
		}
		case 'distribute': {
			runAsAgent(editor, event, () => {
				if (!event.complete) return
				editor.distributeShapes(event.shapeIds as TLShapeId[], event.direction)
			})
			break
		}
		case 'stack': {
			runAsAgent(editor, event, () => {
				if (!event.complete) return
				editor.stackShapes(event.shapeIds as TLShapeId[], event.direction, Math.min(event.gap, 1))
			})
			break
		}
		case 'align': {
			runAsAgent(editor, event, () => {
				if (!event.complete) return
				editor.alignShapes(event.shapeIds as TLShapeId[], event.alignment)
			})
			break
		}
		case 'place': {
			runAsAgent(editor, event, () => {
				if (!event.complete) return
				placeShape(editor, event)
			})
			break
		}
		case 'label': {
			runAsAgent(editor, event, () => {
				if (!event.complete) return
				const shape = editor.getShape(event.shapeId as TLShapeId)
				if (!shape) return
				editor.updateShape({
					id: event.shapeId as TLShapeId,
					type: shape.type,
					props: { richText: asRichText(event.text ?? '') },
				})
			})
			break
		}
		case 'move': {
			runAsAgent(editor, event, () => {
				if (!event.complete) return
				const shape = editor.getShape(event.shapeId as TLShapeId)
				if (!shape) return
				editor.updateShape({
					id: event.shapeId as TLShapeId,
					type: shape.type,
					x: event.x,
					y: event.y,
				})
			})
			break
		}
		case 'delete': {
			runAsAgent(editor, event, () => {
				if (!event.complete) return
				editor.deleteShape(event.shapeId as TLShapeId)
			})
			break
		}
		default: {
			if (!event.complete) {
				createOrUpdateHistoryItem({
					type: 'agent-raw',
					event,
					status: event.complete ? 'done' : 'progress',
				})
				break
			}

			exhaustiveSwitchError(event)
		}
	}
}
