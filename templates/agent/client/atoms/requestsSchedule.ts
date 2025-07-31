import { atom, BoxModel } from 'tldraw'
import { ContextItem } from '../types/ContextItem'

export const $requestsSchedule = atom<ScheduledRequest[]>('requestsSchedule', [])

export interface ScheduledRequest {
	message: string
	type: ScheduledRequestType
	contextItems: ContextItem[]
	bounds: BoxModel
}

export type ScheduledRequestType = 'review' | 'setMyView' | 'user'
