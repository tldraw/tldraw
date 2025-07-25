import { atom, BoxModel } from 'tldraw'
import { ContextItem } from './Context'

export interface ScheduledRequest {
	message: string
	type: ScheduledRequestType | null
	contextItems: ContextItem[]
	bounds: BoxModel
}

export enum ScheduledRequestType {
	Review = 'review',
	SetMyView = 'setMyView',
}

export const $requestsSchedule = atom<ScheduledRequest[]>('requestsSchedule', [])
