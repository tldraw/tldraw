import { TLAiChange } from '@tldraw/ai'
import { ISimpleEvent } from '../worker/simple/schema'

export type Streaming<T> = (Partial<T> & { complete: false }) | (T & { complete: true })

export type TLAgentChange =
	| TLAiChange
	| TLAgentMessageChange
	| TLAgentThinkChange
	| TLAgentScheduleChange
	| TLAgentSetMyViewChange
	| TLAgentRawChange

export interface TLAgentMessageChange {
	type: 'message'
	text: string
}

export interface TLAgentThinkChange {
	type: 'think'
	text: string
}

export interface TLAgentScheduleChange {
	type: 'schedule'
	intent: string
	x: number
	y: number
	w: number
	h: number
}

export interface TLAgentSetMyViewChange {
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
