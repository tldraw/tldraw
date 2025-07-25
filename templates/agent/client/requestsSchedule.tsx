import { atom, BoxModel } from 'tldraw'
import { ContextItem } from './Context'

export interface ScheduledRequest {
	message: string
	review: boolean
	contextItems: ContextItem[]
	bounds: BoxModel
}

export const $requestsSchedule = atom<ScheduledRequest[]>('requestsSchedule', [])
