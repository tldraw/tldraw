import { atom, BoxModel } from 'tldraw'
import { ContextItem } from './Context'

export interface ScheduledRequest {
	message: string
	type: ScheduledRequestType
	contextItems: ContextItem[]
	bounds: BoxModel
}

export type ScheduledRequestType = 'review' | 'setMyView' | 'user'

export const $requestsSchedule = atom<ScheduledRequest[]>('requestsSchedule', [])
