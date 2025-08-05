import { TLAiChange } from '@tldraw/ai'
import {
	ISimpleAlignEvent,
	ISimpleDistributeEvent,
	ISimpleEvent,
	ISimpleLabelEvent,
	ISimpleMoveEvent,
	ISimplePlaceEvent,
	ISimpleStackEvent,
} from '../../worker/simple/schema'

export type Streaming<T> = (Partial<T> & { complete: false }) | (T & { complete: true })

export type TLAgentChange =
	| TLAiChange
	| TLAgentMessageChange
	| TLAgentThinkChange
	| TLAgentScheduleReviewChange
	| TLAgentScheduleSetMyViewChange
	| TLAgentRawChange
	| TLAgentDistributeChange
	| TLAgentStackChange
	| TLAgentAlignChange
	| TLAgentPlaceChange
	| TLAgentLabelChange
	| TLAgentMoveChange

export interface TLAgentMessageChange {
	type: 'message'
	text: string
}

export interface TLAgentThinkChange {
	type: 'think'
	text: string
}

export interface TLAgentScheduleReviewChange {
	type: 'review'
	intent: string
	x: number
	y: number
	w: number
	h: number
}

export interface TLAgentScheduleSetMyViewChange {
	type: 'setMyView'
	intent: string
	x: number
	y: number
	w: number
	h: number
}

export interface TLAgentRawChange {
	type: 'raw'
	event: Streaming<ISimpleEvent>
}

export interface TLAgentDistributeChange extends Omit<ISimpleDistributeEvent, '_type'> {
	type: 'distribute'
}

export interface TLAgentStackChange extends Omit<ISimpleStackEvent, '_type'> {
	type: 'stack'
}

export interface TLAgentAlignChange extends Omit<ISimpleAlignEvent, '_type'> {
	type: 'align'
}

export interface TLAgentPlaceChange extends Omit<ISimplePlaceEvent, '_type'> {
	type: 'place'
}

export interface TLAgentLabelChange extends Omit<ISimpleLabelEvent, '_type'> {
	type: 'label'
}

export interface TLAgentMoveChange extends Omit<ISimpleMoveEvent, '_type'> {
	type: 'move'
}
